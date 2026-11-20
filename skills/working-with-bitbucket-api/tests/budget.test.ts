import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import {
  accountKey, makeStateDir, readRequests, removeStateDir, requestFile, seedRequests, utcHms,
} from './state.ts'
import user from './fixtures/user.json' with { type: 'json' }
import sourceFileMeta from './fixtures/source-file-meta.json' with { type: 'json' }

// `bb` records the time of every request it sends and refuses the next one
// while the last hour holds BB_HOURLY_LIMIT of them. Every call here gets a
// state directory of its own, with a space in its name, and a fixed clock.
const NOW = 1795000000
const EMAIL = 'test@example.com'
const REFUSAL = /^error: rate limited — (\d+) requests in the last hour from this machine; next request at \d\d:\d\d:\d\dZ \(in \d+ s\)\n$/

const shimBin = fileURLToPath(new URL('./fixtures/bin', import.meta.url))
const withShim = { PATH: `${shimBin}:${process.env.PATH ?? ''}` }

/** n epochs that all fall in the last hour, the newest 1 s old. */
function recent(n: number): number[] {
  return Array.from({ length: n }, (_, i) => NOW - 1 - i)
}

describe('bb hourly request budget', () => {
  let server: MockServer
  let dirs: string[] = []

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => {
    server.reset()
    server.stub('GET', '/user', user)
  })
  afterEach(() => {
    for (const dir of dirs) removeStateDir(dir)
    dirs = []
  })

  function stateDir(): string {
    const dir = makeStateDir()
    dirs.push(dir)
    return dir
  }

  function budgetEnv(dir: string, extra: Record<string, string> = {}): Record<string, string> {
    return { BB_STATE_DIR: dir, BB_NOW: String(NOW), ...extra }
  }

  it('Sends up to the ceiling and refuses the next request without sending', async () => {
    // Given a ceiling of 3 requests an hour
    const dir = stateDir()
    const env = budgetEnv(dir, { BB_HOURLY_LIMIT: '3' })

    // When I make four calls
    const results = []
    for (let i = 0; i < 4; i++) results.push(await bb('api /user', { port: server.port, env }))

    // Then the first three go out and the fourth is refused
    assert.deepEqual(results.map((r) => r.exitCode), [0, 0, 0, 75])
    assert.match(results[3].stderr, REFUSAL)
    assert.match(results[3].stderr, /^error: rate limited — 3 requests /)
    assert.equal(results[3].stdout, '')
    // And the refused request never reached the server
    assert.equal(server.getCalls().length, 3)
  })

  it('Names the time the oldest request leaves the window', async () => {
    // Given three requests, the oldest 3000 s ago, and a ceiling of 3
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3000, NOW - 2000, NOW - 1000])

    // When I make a call
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the refusal names the second at which the oldest one is an hour old
    assert.equal(result.exitCode, 75)
    assert.ok(
      result.stderr.includes(`next request at ${utcHms(NOW + 600)} (in 600 s)`),
      `unexpected stderr: ${result.stderr}`,
    )
  })

  it('Counts requests across the current and the previous hour', async () => {
    // Given two requests in the previous UTC hour and one in the current hour
    const dir = stateDir()
    assert.notEqual(requestFile(dir, EMAIL, NOW - 3000), requestFile(dir, EMAIL, NOW - 60))
    seedRequests(dir, EMAIL, [NOW - 3000, NOW - 2000, NOW - 60])

    // When I make a call with a ceiling of 3
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then all three count, and the oldest sets the wait
    assert.equal(result.exitCode, 75)
    assert.ok(result.stderr.includes(`next request at ${utcHms(NOW + 600)} (in 600 s)`), result.stderr)
  })

  it('Names the (n - c + 1)-th oldest request when the ceiling was lowered', async () => {
    // Given five requests and a ceiling of 3: the third oldest must leave first
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3400, NOW - 3000, NOW - 2000, NOW - 1000, NOW - 60])

    // When I make a call
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the wait ends when only two requests are left in the window
    assert.equal(result.exitCode, 75)
    assert.ok(result.stderr.includes(`next request at ${utcHms(NOW + 1600)} (in 1600 s)`), result.stderr)
  })

  it('Counts only the last 3600 s', async () => {
    // Given three requests, each 3601 s old
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3601, NOW - 3601, NOW - 3601])

    // When I make a call with a ceiling of 3
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then none of them count
    assert.equal(result.exitCode, 0)
  })

  it('Does not count a request that is exactly 3600 s old', async () => {
    // Given three requests, each exactly an hour old
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3600, NOW - 3600, NOW - 3600])

    // When I make a call with a ceiling of 3
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the window holds requests newer than 3600 s, so none of them count
    assert.equal(result.exitCode, 0)
  })

  it('Deletes request files older than the previous hour', async () => {
    // Given one request from 3 h ago, one from the previous UTC hour, and one from 2 h ago
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3 * 3600, NOW - 2 * 3600, NOW - 3000])

    // When I make a call
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir) })

    // Then the files of the older hours are gone
    assert.equal(result.exitCode, 0)
    assert.equal(existsSync(requestFile(dir, EMAIL, NOW - 3 * 3600)), false)
    assert.equal(existsSync(requestFile(dir, EMAIL, NOW - 2 * 3600)), false)
    // And the previous hour's file stays, and the current hour's file holds the new line
    assert.equal(existsSync(requestFile(dir, EMAIL, NOW - 3000)), true)
    assert.deepEqual(readFileSync(requestFile(dir, EMAIL, NOW), 'utf8').split('\n').filter(Boolean), [String(NOW)])
  })

  it('Defaults to 800 requests', async () => {
    // Given 799 requests in the last hour
    const below = stateDir()
    seedRequests(below, EMAIL, recent(799))

    // When I make a call without BB_HOURLY_LIMIT
    const sent = await bb('api /user', { port: server.port, env: budgetEnv(below) })

    // Then it goes out
    assert.equal(sent.exitCode, 0)

    // Given 800 requests in the last hour
    const at = stateDir()
    seedRequests(at, EMAIL, recent(800))

    // When I make a call without BB_HOURLY_LIMIT
    const refused = await bb('api /user', { port: server.port, env: budgetEnv(at) })

    // Then it is refused and names the default
    assert.equal(refused.exitCode, 75)
    assert.match(refused.stderr, /800 requests/)
    assert.equal(server.getCalls().length, 1)
  })

  it('Records requests with BB_HOURLY_LIMIT=0 and never refuses', async () => {
    // Given 900 requests in the last hour
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(900))

    // When I make a call with the ceiling off
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '0' }) })

    // Then it goes out and is recorded
    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
    assert.equal(readRequests(dir, EMAIL).length, 901)
  })

  it('Reads BB_HOURLY_LIMIT with leading zeros as a decimal number', async () => {
    // Given two requests in the last hour and a ceiling written as 02
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(2))

    // When I make a call
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '02' }) })

    // Then the ceiling is 2 and the call is refused
    assert.equal(result.exitCode, 75)
    assert.match(result.stderr, /^error: rate limited — 2 requests /)
  })

  it('Refuses a malformed BB_HOURLY_LIMIT without sending', async () => {
    for (const value of ['abc', '-1', '1.5', '3 requests']) {
      // Given a ceiling that is not a whole number
      const dir = stateDir()

      // When I make a call
      const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: value }) })

      // Then bb exits 1 with the usage error and sends nothing
      assert.equal(result.exitCode, 1, `value '${value}'`)
      assert.equal(result.stderr, `error: BB_HOURLY_LIMIT must be a whole number, got '${value}'\n`)
      assert.equal(result.stdout, '')
    }
    assert.equal(server.getCalls().length, 0)
  })

  it('Ignores BB_NOW unless BB_API_URL is set', async () => {
    // Given a curl that fails the test when it runs, so that no request leaves the machine
    const bin = mkdtempSync(path.join(tmpdir(), 'bb-budget-bin-'))
    const called = path.join(bin, 'called')
    writeFileSync(path.join(bin, 'curl'), `#!/bin/sh\ntouch '${called}'\nexit 99\n`, { mode: 0o755 })
    try {
      // And one request from a minute ago by the real clock, and a BB_NOW two hours ahead
      const dir = stateDir()
      const real = Math.floor(Date.now() / 1000)
      seedRequests(dir, EMAIL, [real - 60])

      // When I make a call with a ceiling of 1 and no BB_API_URL
      const result = await bb('api /user', {
        port: server.port,
        env: {
          PATH: `${bin}:${process.env.PATH ?? ''}`,
          BB_API_URL: '', BB_STATE_DIR: dir, BB_NOW: String(real + 7200), BB_HOURLY_LIMIT: '1',
        },
      })

      // Then the real clock decides: the request counts, and the call is refused before curl runs
      assert.equal(result.exitCode, 75)
      assert.match(result.stderr, REFUSAL)
      assert.equal(existsSync(called), false)
    } finally {
      rmSync(bin, { recursive: true, force: true })
    }
  })

  it('Takes neither the account key nor the warning flag from the environment', async () => {
    // Given an environment that carries a key and a set warning flag
    const dir = stateDir()
    const env = budgetEnv(dir, { BB_ACCOUNT_KEY: 'deadbeef0000', BB_STATE_WARNED: '1' })

    // When I make a call
    await bb('api /user', { port: server.port, env })

    // Then the request is recorded under the account's own key
    assert.deepEqual(readRequests(dir, EMAIL), [NOW])
    assert.equal(readdirSync(dir).some((name) => name.includes('deadbeef0000')), false)

    // And a state directory that cannot be used still gives its warning
    mkdirSync(path.dirname(dir), { recursive: true })
    const blocker = path.join(path.dirname(dir), 'not a directory')
    writeFileSync(blocker, 'x')
    const result = await bb('api /user', { port: server.port, env: { ...env, BB_STATE_DIR: path.join(blocker, 'bb state') } })
    assert.equal(result.exitCode, 0)
    assert.match(result.stderr, /^warning: bb cannot keep its request count in /)
  })

  it('Records one line per request at every request site', async () => {
    const calls = () => server.getCalls().length

    // api: one request
    let dir = stateDir()
    let result = await bb('api /user', { port: server.port, env: budgetEnv(dir) })
    assert.equal(result.exitCode, 0)
    assert.deepEqual(readRequests(dir, EMAIL), [NOW], 'bb api')
    assert.equal(calls(), 1)

    // pr list --all over two pages: one request per page
    server.reset()
    const PRS = '/repositories/testws/testrepo/pullrequests'
    const page = (n: number) => ({
      values: [{
        id: n, title: `PR ${n}`, state: 'OPEN', author: { display_name: 'A', nickname: 'a' },
        source: { branch: { name: 'src' } }, destination: { branch: { name: 'main' } },
      }],
      ...(n < 2 ? { next: `${server.baseUrl}${PRS}?state=OPEN&pagelen=50&page=${n + 1}` } : {}),
    })
    server.stub('GET', PRS, page(1))
    server.stubWithQuery('GET', PRS, { page: '2' }, page(2))
    dir = stateDir()
    result = await bb('pr list --all', { port: server.port, env: budgetEnv(dir) })
    assert.equal(result.exitCode, 0)
    assert.equal(calls(), 2)
    assert.deepEqual(readRequests(dir, EMAIL), [NOW, NOW], 'bb pr list --all')

    // source cat: the metadata request and the raw request
    server.reset()
    const hash = 'abc123def4567890abcdef1234567890abcdef12'
    const SRC = `/repositories/testws/testrepo/src/${hash}/README.md`
    server.stubRaw('GET', SRC, '# Test Repository')
    server.stubWithQuery('GET', SRC, { format: 'meta' }, sourceFileMeta)
    dir = stateDir()
    result = await bb(`source cat README.md --ref ${hash}`, { port: server.port, env: budgetEnv(dir) })
    assert.equal(result.exitCode, 0)
    assert.equal(calls(), 2)
    assert.deepEqual(readRequests(dir, EMAIL), [NOW, NOW], 'bb source cat')

    // download upload: one request
    server.reset()
    server.stub('POST', '/repositories/testws/testrepo/downloads', {}, 201)
    const tmp = mkdtempSync(path.join(tmpdir(), 'bb-budget-'))
    try {
      const file = path.join(tmp, 'shot.png')
      writeFileSync(file, 'PNGDATA')
      dir = stateDir()
      result = await bb(['download', 'upload', file], { port: server.port, env: budgetEnv(dir) })
      assert.equal(result.exitCode, 0)
      assert.equal(calls(), 1)
      assert.deepEqual(readRequests(dir, EMAIL), [NOW], 'bb download upload')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }

    // auth login: one request, under the email being validated
    server.reset()
    server.stub('GET', '/user', user)
    dir = stateDir()
    result = await bb(['auth', 'login', '--email', 'other@example.com'], {
      port: server.port, input: 'my-api-token\n', env: { ...budgetEnv(dir), ...withShim },
    })
    assert.equal(result.exitCode, 0)
    assert.equal(calls(), 1)
    assert.deepEqual(readRequests(dir, 'other@example.com'), [NOW], 'bb auth login')
    assert.deepEqual(readRequests(dir, EMAIL), [])
  })

  it('Keeps one count per account, whatever the case of the email', async () => {
    // Given two calls under the same address in different case
    const dir = stateDir()
    await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_EMAIL: 'Test@Example.com' }) })
    await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_EMAIL: 'test@example.com' }) })

    // Then both add to one file
    assert.equal(readRequests(dir, EMAIL).length, 2)
    assert.equal(accountKey('Test@Example.com'), accountKey('test@example.com'))

    // When another account makes a call
    await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_EMAIL: 'other@example.com' }) })

    // Then it writes to a file of its own
    assert.equal(readRequests(dir, 'other@example.com').length, 1)
    assert.equal(readRequests(dir, EMAIL).length, 2)
  })

  it('Shows a wait of 429 s as 430 s', async () => {
    // Given one request that leaves the window in 429 s, and a ceiling of 1
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3171])

    // When I make a call
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '1' }) })

    // Then the wait and its end time are one second longer
    assert.equal(result.exitCode, 75)
    assert.ok(result.stderr.includes('(in 430 s)'), result.stderr)
    assert.ok(result.stderr.includes(utcHms(NOW + 430)), result.stderr)
    assert.doesNotMatch(result.stderr, /\b429\b/)
  })

  it('Ignores lines that are not epoch seconds', async () => {
    // Given a request file with garbage around two valid lines
    const dir = stateDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      requestFile(dir, EMAIL, NOW - 100),
      ['abc', '', '12abc', '-5', '1.5', `${NOW - 100}`, `${NOW - 90}`, ''].join('\n'),
    )

    // When I make a call with a ceiling of 3
    const result = await bb('api /user', { port: server.port, env: budgetEnv(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then only the two valid lines count
    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
  })

  it('Warns once and sends when the state directory cannot be created', async () => {
    // Given a state directory below a regular file
    const dir = stateDir()
    mkdirSync(path.dirname(dir), { recursive: true })
    const blocker = path.join(path.dirname(dir), 'not a directory')
    writeFileSync(blocker, 'x')
    const blocked = path.join(blocker, 'bb state')

    // When I make a call
    const result = await bb('api /user', { port: server.port, env: budgetEnv(blocked) })

    // Then it goes out, with exactly one warning that names the path
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 1)
    assert.equal(
      result.stderr,
      `warning: bb cannot keep its request count in ${blocked}; the hourly budget is off for this call\n`,
    )
  })

  it('Warns once and sends when no state directory can be found', async () => {
    // Given no variable that names a state directory
    const env = { BB_STATE_DIR: '', XDG_STATE_HOME: '', HOME: '', BB_NOW: String(NOW) }

    // When I make a call
    const result = await bb('api /user', { port: server.port, env })

    // Then it goes out, with one warning
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 1)
    const warnings = result.stderr.split('\n').filter((line) => line.startsWith('warning:'))
    assert.equal(warnings.length, 1, result.stderr)
  })

  it('Keeps the ceiling under parallel calls', async () => {
    // Given a state directory that does not exist yet and a ceiling of 3
    const dir = stateDir()
    const env = budgetEnv(dir, { BB_HOURLY_LIMIT: '3' })
    assert.equal(existsSync(dir), false)

    // When five calls start together
    const results = await Promise.all(
      Array.from({ length: 5 }, () => bb('api /user', { port: server.port, env })),
    )

    // Then at least the ceiling goes out, every request that went out is recorded,
    // and no call warns about the state directory it created together with the others
    const sent = server.getCalls().length
    assert.ok(sent >= 3 && sent <= 5, `sent ${sent}`)
    assert.equal(readRequests(dir, EMAIL).length, sent)
    assert.equal(results.filter((r) => r.exitCode === 0).length, sent)
    assert.equal(results.filter((r) => r.exitCode === 75).length, 5 - sent)
    for (const result of results) {
      assert.equal(result.stderr.split('\n').some((line) => line.startsWith('warning:')), false, result.stderr)
    }
  })
})
