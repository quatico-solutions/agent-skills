import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { accountKey, makeStateDir, readPause, readRequests, removeStateDir, seedPause, utcHms } from './state.ts'
import user from './fixtures/user.json' with { type: 'json' }

// After a 429, `bb` writes a pause file and every `bb` process of the same
// account on the same machine refuses to send until the pause has ended. The
// first pause is 300 s; a 429 soon after a pause doubles it, up to 3600 s; a
// numeric Retry-After sets a pause of at least that many seconds. Every call
// has its own state directory, with a space in its name, and a fixed clock.
const NOW = 1795000000
const EMAIL = 'test@example.com'
const SLOW = { error: { message: 'slow down' } }

const shimBin = fileURLToPath(new URL('./fixtures/bin', import.meta.url))
const withShim = { PATH: `${shimBin}:${process.env.PATH ?? ''}` }

describe('bb pause after HTTP 429', () => {
  let server: MockServer
  let dirs: string[] = []

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())
  afterEach(() => {
    for (const dir of dirs) removeStateDir(dir)
    dirs = []
  })

  function stateDir(): string {
    const dir = makeStateDir()
    dirs.push(dir)
    return dir
  }

  function env(dir: string, extra: Record<string, string> = {}): Record<string, string> {
    return { BB_STATE_DIR: dir, BB_NOW: String(NOW), ...extra }
  }

  /**
   * Runs bb and asserts that stderr never names the status number: Plot reads a
   * 429 in stderr as a short burst, not a spent quota.
   */
  async function run(args: string | string[], opts: Parameters<typeof bb>[1], { allow429 = false } = {}) {
    const result = await bb(args, opts)
    if (!allow429) assert.doesNotMatch(result.stderr, /\b429\b/)
    return result
  }

  /** The single-request line for a pause that ends `seconds` after NOW. */
  function paused(seconds: number): string {
    return `error: rate limited — bb paused until ${utcHms(NOW + seconds)} (in ${seconds} s)\n`
  }

  /** Calls GET /user, which answers 429, with the given pause already in place. */
  async function hit429(dir: string, extra: Record<string, string> = {}) {
    const result = await run('api /user', { port: server.port, env: env(dir, extra) })
    assert.equal(result.exitCode, 75, result.stderr)
    assert.equal(result.stdout, '')
    return result
  }

  it('Pauses for 300 s after a 429 and refuses the next call without sending', async () => {
    // Given the API answers 429
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()

    // When I make a call
    const first = await hit429(dir)

    // Then bb exits 75, says when it sends again, and stores a pause of 300 s
    assert.equal(first.stderr, paused(300))
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })

    // When I make a second call
    const second = await run('api /user', { port: server.port, env: env(dir) })

    // Then it is refused by the pause and never reaches the server
    assert.equal(second.exitCode, 75)
    assert.equal(second.stdout, '')
    assert.equal(
      second.stderr,
      `error: rate limited — bb paused until ${utcHms(NOW + 300)} after Bitbucket refused a request (in 300 s)\n`,
    )
    assert.doesNotMatch(second.stderr, /\b429\b/)
    assert.equal(server.getCalls().length, 1)

    // And the refused call is not recorded: only the first request counts
    assert.deepEqual(readRequests(dir, EMAIL), [NOW])
  })

  it('Sends again once the pause has ended', async () => {
    // Given a pause that ended 1 s ago
    server.stub('GET', '/user', user)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 1, 300)

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(dir) })

    // Then it goes out
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 1)
    assert.doesNotMatch(result.stderr, /\b429\b/)
  })

  it('Refuses a call while 1 s of the pause is left', async () => {
    // Given a pause that ends in 1 s
    server.stub('GET', '/user', user)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 1, 300)

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(dir) })

    // Then it is refused, and no request was sent
    assert.equal(result.exitCode, 75)
    assert.equal(
      result.stderr,
      `error: rate limited — bb paused until ${utcHms(NOW + 1)} after Bitbucket refused a request (in 1 s)\n`,
    )
    assert.equal(server.getCalls().length, 0)
  })

  it('Applies the pause when the ceiling is off', async () => {
    // Given a pause and BB_HOURLY_LIMIT=0
    server.stub('GET', '/user', user)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 120, 300)

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '0' }) })

    // Then the pause still refuses it
    assert.equal(result.exitCode, 75)
    assert.match(result.stderr, /after Bitbucket refused a request \(in 120 s\)\n$/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Shows an active pause with 429 s left as 430 s', async () => {
    // Given a pause with 429 s left
    server.stub('GET', '/user', user)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 429, 600)

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(dir) })

    // Then the wait is shown as 430 s, with the end 1 s later
    assert.equal(result.exitCode, 75)
    assert.equal(
      result.stderr,
      `error: rate limited — bb paused until ${utcHms(NOW + 430)} after Bitbucket refused a request (in 430 s)\n`,
    )
  })

  it('Keeps one pause per account, whatever the case of the email', async () => {
    // Given a pause under the lowercased email
    server.stub('GET', '/user', user)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 120, 300)

    // When another account calls, and the same account calls with capitals
    const other = await run('api /user', { port: server.port, env: env(dir, { BB_EMAIL: 'other@example.com' }) })
    const same = await run('api /user', { port: server.port, env: env(dir, { BB_EMAIL: 'Test@Example.com' }) })

    // Then the other account sends and the same account is refused
    assert.equal(other.exitCode, 0)
    assert.equal(same.exitCode, 75)
    assert.equal(server.getCalls().length, 1)
  })

  it('Doubles a pause that ended less than an hour ago', async () => {
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 600, 300)

    const result = await hit429(dir)

    assert.equal(result.stderr, paused(600))
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 600, length: 600 })
  })

  it('Never doubles past 3600 s', async () => {
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 60, 3600)

    const result = await hit429(dir)

    assert.equal(result.stderr, paused(3600))
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 3600, length: 3600 })
  })

  it('Doubles 1800 s to 3600 s', async () => {
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 60, 1800)

    await hit429(dir)

    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 3600, length: 3600 })
  })

  it('Starts again at 300 s after an hour of quiet', async () => {
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 3601, 1200)

    const result = await hit429(dir)

    assert.equal(result.stderr, paused(300))
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })
  })

  it('Doubles a pause that ended 3599 s ago and restarts one that ended 3600 s ago', async () => {
    // Given a pause that ended 3599 s ago
    server.stub('GET', '/user', SLOW, 429)
    let dir = stateDir()
    seedPause(dir, EMAIL, NOW - 3599, 300)

    // Then the next 429 doubles it
    await hit429(dir)
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 600, length: 600 })

    // Given a pause that ended 3600 s ago
    dir = stateDir()
    seedPause(dir, EMAIL, NOW - 3600, 300)

    // Then the next 429 starts again at 300 s
    await hit429(dir)
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })
  })

  it('Extends an active pause without doubling it', async () => {
    // Given a 429 that arrives while another process has just stored a pause of 300 s ending in 100 s
    const dir = stateDir()
    server.stubSequence('GET', '/user', {}, [
      { status: 429, body: SLOW, beforeRespond: () => seedPause(dir, EMAIL, NOW + 100, 300) },
    ])

    // When the call gets its 429
    const result = await hit429(dir)

    // Then the end moves to 300 s from now and the length stays
    assert.equal(result.stderr, paused(300))
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })

    // Given a stored pause that ends later than a new one would
    server.reset()
    const longer = stateDir()
    server.stubSequence('GET', '/user', {}, [
      { status: 429, body: SLOW, beforeRespond: () => seedPause(longer, EMAIL, NOW + 1000, 600) },
    ])

    // When the call gets its 429
    const kept = await hit429(longer)

    // Then the stored pause stays as it is, and the message names its end
    assert.equal(kept.stderr, paused(1000))
    assert.deepEqual(readPause(longer, EMAIL), { until: NOW + 1000, length: 600 })
  })

  it('Leaves one pause of 300 s after several 429s at once', async () => {
    // Given the API answers 429 every time
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()

    // When five calls run together
    const results = await Promise.all(
      Array.from({ length: 5 }, () => run('api /user', { port: server.port, env: env(dir) })),
    )

    // Then every one exits 75 and the pause is still 300 s
    for (const result of results) {
      assert.equal(result.exitCode, 75, result.stderr)
      assert.equal(result.stdout, '')
      assert.equal(result.stderr.split('\n').some((line) => line.startsWith('warning:')), false, result.stderr)
    }
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })
  })

  it('Pauses at least as long as Retry-After, beyond 3600 s', async () => {
    server.stubSequence('GET', '/user', {}, [{ status: 429, body: SLOW, headers: { 'Retry-After': '7200' } }])
    const dir = stateDir()

    const result = await hit429(dir)

    assert.equal(
      result.stderr,
      `error: rate limited — Bitbucket asked to wait 7200 s; bb paused until ${utcHms(NOW + 7200)} (in 7200 s)\n`,
    )
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 7200, length: 7200 })
  })

  it('Lifts a doubled pause to a longer Retry-After', async () => {
    // Given a pause that ended 10 s ago, so that the next one is 600 s long by doubling
    server.stubSequence('GET', '/user', {}, [{ status: 429, body: SLOW, headers: { 'Retry-After': '900' } }])
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 10, 300)

    // When the 429 names 900 s
    const result = await hit429(dir)

    // Then the pause is 900 s
    assert.equal(
      result.stderr,
      `error: rate limited — Bitbucket asked to wait 900 s; bb paused until ${utcHms(NOW + 900)} (in 900 s)\n`,
    )
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 900, length: 900 })
  })

  it('Keeps the doubled length when Retry-After is shorter', async () => {
    server.stubSequence('GET', '/user', {}, [{ status: 429, body: SLOW, headers: { 'Retry-After': '30' } }])
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 10, 300)

    const result = await hit429(dir)

    assert.equal(
      result.stderr,
      `error: rate limited — Bitbucket asked to wait 30 s; bb paused until ${utcHms(NOW + 600)} (in 600 s)\n`,
    )
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 600, length: 600 })
  })

  it('Reads a Retry-After with leading zeros as a decimal number', async () => {
    server.stubSequence('GET', '/user', {}, [{ status: 429, body: SLOW, headers: { 'Retry-After': '0900' } }])
    const dir = stateDir()

    const result = await hit429(dir)

    assert.equal(
      result.stderr,
      `error: rate limited — Bitbucket asked to wait 0900 s; bb paused until ${utcHms(NOW + 900)} (in 900 s)\n`,
    )
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 900, length: 900 })
  })

  it('Pauses for 999999999 s at most for a Retry-After of more than 9 digits', async () => {
    const huge = '99999999999999999999999'
    server.stubSequence('GET', '/user', {}, [{ status: 429, body: SLOW, headers: { 'Retry-After': huge } }])
    const dir = stateDir()

    const result = await run('api /user', { port: server.port, env: env(dir) })

    assert.equal(result.exitCode, 75)
    assert.equal(readPause(dir, EMAIL)?.length, 999999999)
    assert.match(result.stderr, new RegExp(`^error: rate limited — Bitbucket asked to wait ${huge} s; bb paused until \\d\\d:\\d\\d:\\d\\dZ \\(in 999999999 s\\)\\n$`))
  })

  it('Ignores a Retry-After that is not a number', async () => {
    server.stubSequence('GET', '/user', {}, [
      { status: 429, body: SLOW, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } },
    ])
    const dir = stateDir()

    const result = await hit429(dir)

    assert.equal(result.stderr, paused(300))
    assert.doesNotMatch(result.stderr, /asked to wait/)
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })
  })

  it('Shows a pause of exactly 429 s as 430 s', async () => {
    // Given a Retry-After of 429 s: the header value prints as it is, so stderr names 429 here; the wait is shown as 430 s
    server.stubSequence('GET', '/user', {}, [{ status: 429, body: SLOW, headers: { 'Retry-After': '429' } }])
    const dir = stateDir()

    const result = await run('api /user', { port: server.port, env: env(dir) }, { allow429: true })

    assert.equal(result.exitCode, 75)
    assert.equal(
      result.stderr,
      `error: rate limited — Bitbucket asked to wait 429 s; bb paused until ${utcHms(NOW + 430)} (in 430 s)\n`,
    )
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 429, length: 429 })
  })

  it('Treats an unreadable pause file as no pause', async () => {
    // Given a pause file that holds garbage
    server.stub('GET', '/user', user)
    const dir = stateDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, `pause-${accountKey(EMAIL)}`), 'garbage\n')

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(dir) })

    // Then it goes out
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 1)
    assert.equal(result.stderr, '')
  })

  it('Treats a pause of length 0 as no pause', async () => {
    // Given a pause file that ends in 100 s and names a length of 0 s, which bb never writes
    server.stub('GET', '/user', user)
    const dir = stateDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, `pause-${accountKey(EMAIL)}`), `${NOW + 100} 0\n`)

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(dir) })

    // Then it goes out
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 1)
  })

  it('Replaces an unreadable pause file on the next 429', async () => {
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, `pause-${accountKey(EMAIL)}`), '1795000100 0123456789012345678\n')

    const result = await hit429(dir)

    assert.equal(result.stderr, paused(300))
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })
  })

  it('Stops a listing at its first 429 and prints no rows', async () => {
    // Given page 1 holds 50 rows and page 2 answers 429
    const PRS = '/repositories/testws/testrepo/pullrequests'
    server.stub('GET', PRS, {
      values: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
      next: `${server.baseUrl}${PRS}?state=OPEN&pagelen=50&page=2`,
    })
    server.stubSequence('GET', PRS, { page: '2' }, [{ status: 429, body: SLOW }])
    const dir = stateDir()

    // When I read all pages
    const result = await run('pr list --all --json', { port: server.port, env: env(dir) })

    // Then bb stops at once: two requests, no rows, one pause
    assert.equal(result.exitCode, 75)
    assert.equal(result.stdout, '')
    assert.equal(
      result.stderr,
      `error: rate limited after 50 rows — bb paused until ${utcHms(NOW + 300)} (in 300 s)\n`,
    )
    assert.equal(server.getCalls().length, 2)
    assert.deepEqual(readPause(dir, EMAIL), { until: NOW + 300, length: 300 })
  })

  it('Names Retry-After and the rows read when a listing stops', async () => {
    server.stubSequence('GET', '/repositories/testws/testrepo/pullrequests', {}, [
      { status: 429, body: SLOW, headers: { 'Retry-After': '3600' } },
    ])
    const dir = stateDir()

    const result = await run('pr list --json', { port: server.port, env: env(dir) })

    assert.equal(result.exitCode, 75)
    assert.equal(result.stdout, '')
    assert.equal(
      result.stderr,
      `error: rate limited after 0 rows — Bitbucket asked to wait 3600 s; bb paused until ${utcHms(NOW + 3600)} (in 3600 s)\n`,
    )
  })

  it('Starts no pause on HTTP 500', async () => {
    server.stub('GET', '/user', { error: { message: 'boom' } }, 500)
    const dir = stateDir()

    const result = await run('api /user', { port: server.port, env: env(dir) })

    assert.equal(result.exitCode, 1)
    assert.equal(readPause(dir, EMAIL), null)
  })

  it('Answers a 429 at auth login with exit 75 and a pause', async () => {
    // Given the API answers 429 to the token check
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()

    // When I log in as another account
    const result = await run(['auth', 'login', '--email', 'other@example.com'], {
      port: server.port,
      input: 'my-api-token\n',
      env: { ...env(dir), ...withShim },
    })

    // Then bb prints the single-request line, not "authentication failed", and exits 75
    assert.equal(result.exitCode, 75)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, paused(300))
    assert.doesNotMatch(result.stderr, /authentication failed/)
    assert.doesNotMatch(result.stderr, /\b429\b/)

    // And the pause belongs to the account that logged in
    assert.deepEqual(readPause(dir, 'other@example.com'), { until: NOW + 300, length: 300 })
    assert.equal(readPause(dir, EMAIL), null)
  })

  it('Refuses auth login while the account is paused', async () => {
    // Given a pause under the email that logs in
    server.stub('GET', '/user', user)
    const dir = stateDir()
    seedPause(dir, 'other@example.com', NOW + 200, 300)

    // When I log in
    const result = await run(['auth', 'login', '--email', 'other@example.com'], {
      port: server.port,
      input: 'my-api-token\n',
      env: { ...env(dir), ...withShim },
    })

    // Then bb refuses without a request
    assert.equal(result.exitCode, 75)
    assert.match(result.stderr, /^error: rate limited — bb paused until \d\d:\d\d:\d\dZ after Bitbucket refused a request \(in 200 s\)\n$/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Warns once, prints the line and exits 75 when the pause cannot be stored', async () => {
    // Given the API answers 429 and the state directory sits below a regular file
    server.stub('GET', '/user', SLOW, 429)
    const dir = stateDir()
    mkdirSync(path.dirname(dir), { recursive: true })
    const blocker = path.join(path.dirname(dir), 'not a directory')
    writeFileSync(blocker, 'x')
    const blocked = path.join(blocker, 'bb state')

    // When I make a call
    const result = await run('api /user', { port: server.port, env: env(blocked) })

    // Then the warning comes once, then the line of the pause bb could not store
    assert.equal(result.exitCode, 75)
    assert.equal(result.stdout, '')
    assert.equal(
      result.stderr,
      `warning: bb cannot keep its request count in ${blocked}; the hourly budget is off for this call\n${paused(300)}`,
    )
  })

  it('Warns once and exits 75 when the pause file cannot be written', { skip: process.getuid?.() === 0 }, async () => {
    // Given a state directory that works until the 429 arrives, and then no longer takes files
    const dir = stateDir()
    server.stubSequence('GET', '/user', {}, [
      { status: 429, body: SLOW, beforeRespond: () => chmodSync(dir, 0o500) },
    ])

    try {
      // When I make a call
      const result = await run('api /user', { port: server.port, env: env(dir) })

      // Then bb warns once, prints the line of the pause it could not store, and exits 75
      assert.equal(result.exitCode, 75)
      assert.equal(result.stdout, '')
      assert.equal(
        result.stderr,
        `warning: bb cannot keep its request count in ${dir}; the hourly budget is off for this call\n${paused(300)}`,
      )
      assert.equal(readPause(dir, EMAIL), null)
    } finally {
      chmodSync(dir, 0o700)
    }
  })
})
