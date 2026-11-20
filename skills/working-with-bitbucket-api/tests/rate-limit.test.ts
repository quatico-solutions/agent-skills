import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { accountKey, makeStateDir, readRequests, removeStateDir, requestFile, seedPause, seedRequests, utcHms } from './state.ts'

// `bb rate-limit` reads the request count and the pause that `bb` keeps for the
// account on this machine. It never sends a request, so the mock server must
// see no call. Every call has its own state directory, with a space in its
// name, and a fixed clock.
const NOW = 1795000000
const EMAIL = 'test@example.com'

/** n epochs that all fall in the last hour, the newest 1 s old. */
function recent(n: number): number[] {
  return Array.from({ length: n }, (_, i) => NOW - 1 - i)
}

describe('bb rate-limit', () => {
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

  it('Prints the count and the ceiling without sending a request', async () => {
    // Given 12 requests in the last hour
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(12))

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then it prints the count against the default ceiling and exits 0
    assert.equal(result.stdout, 'requests in the last hour: 12 of 800 (this machine)\n')
    assert.equal(result.stderr, '')
    assert.equal(result.exitCode, 0)

    // And it sent no request and recorded none
    assert.equal(server.getCalls().length, 0)
    assert.equal(readRequests(dir, EMAIL).length, 12)
  })

  it('Counts a request that is older than an hour as no request', async () => {
    // Given 5 requests in the last hour and 4 older ones
    const dir = stateDir()
    seedRequests(dir, EMAIL, [...recent(5), NOW - 3600, NOW - 3601, NOW - 7000, NOW - 9000])

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then only the 5 count
    assert.equal(result.stdout, 'requests in the last hour: 5 of 800 (this machine)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Prints 0 when bb has recorded nothing yet', async () => {
    // Given a state directory that does not exist yet
    const dir = stateDir()

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then it prints 0 and exits 0
    assert.equal(result.stdout, 'requests in the last hour: 0 of 800 (this machine)\n')
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 0)
  })

  it('Exits 75 at the ceiling and names when the next request can go out', async () => {
    // Given a ceiling of 3 reached by requests 300 s, 200 s and 100 s old
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 300, NOW - 200, NOW - 100])

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then a second line names the second at which the oldest request leaves the hour, and the exit status is 75
    assert.equal(
      result.stdout,
      `requests in the last hour: 3 of 3 (this machine)\nnext request at ${utcHms(NOW + 3300)} (in 3300 s)\n`,
    )
    assert.equal(result.exitCode, 75)
    assert.equal(server.getCalls().length, 0)
  })

  it('Names the next request one request above the ceiling too', async () => {
    // Given a ceiling of 3 and 5 requests, so the third newest decides
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 500, NOW - 400, NOW - 300, NOW - 200, NOW - 100])

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the next request is possible when the third oldest request leaves the hour: 3 must go for the count to drop to 2
    assert.equal(
      result.stdout,
      `requests in the last hour: 5 of 3 (this machine)\nnext request at ${utcHms(NOW + 3300)} (in 3300 s)\n`,
    )
    assert.equal(result.exitCode, 75)
  })

  it('Shows a ceiling wait of 429 s as 430 s', async () => {
    // Given a ceiling of 1 reached by a request that leaves the hour in 429 s
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 3600 + 429])

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '1' }) })

    // Then the wait reads 430 s, with the end time 1 s later
    assert.equal(
      result.stdout,
      `requests in the last hour: 1 of 1 (this machine)\nnext request at ${utcHms(NOW + 430)} (in 430 s)\n`,
    )
    assert.doesNotMatch(result.stdout, /\b429\b/)
    assert.equal(result.exitCode, 75)
  })

  it('Names the pause first and the next request second when both apply', async () => {
    // Given a ceiling of 3 reached by requests 300 s, 200 s and 100 s old, and a pause of 120 s left
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 300, NOW - 200, NOW - 100])
    seedPause(dir, EMAIL, NOW + 120, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the count line is followed by the pause line and the next-request line, in that order
    assert.equal(
      result.stdout,
      [
        'requests in the last hour: 3 of 3 (this machine)',
        `paused until ${utcHms(NOW + 120)} (in 120 s)`,
        `next request at ${utcHms(NOW + 3300)} (in 3300 s)`,
        '',
      ].join('\n'),
    )
    assert.equal(result.exitCode, 75)
  })

  it('Names no next request below the ceiling, with a pause or without', async () => {
    // Given a ceiling of 3 and 2 requests, and a pause
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 300, NOW - 200])
    seedPause(dir, EMAIL, NOW + 120, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then only the pause line follows the count
    assert.equal(
      result.stdout,
      `requests in the last hour: 2 of 3 (this machine)\npaused until ${utcHms(NOW + 120)} (in 120 s)\n`,
    )
    assert.doesNotMatch(result.stdout, /next request/)
    assert.equal(result.exitCode, 75)
  })

  it('Names no next request with the ceiling off, however many requests it holds', async () => {
    // Given 5 requests and BB_HOURLY_LIMIT=0
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(5))

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '0' }) })

    // Then the output is the count line alone
    assert.equal(result.stdout, 'requests in the last hour: 5 (no ceiling)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Exits 0 one request below the ceiling', async () => {
    // Given a ceiling of 3 and 2 requests in the last hour
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(2))

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then it exits 0
    assert.equal(result.stdout, 'requests in the last hour: 2 of 3 (this machine)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Names an active pause and exits 75', async () => {
    // Given a pause that ends in 300 s and 12 requests in the last hour
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(12))
    seedPause(dir, EMAIL, NOW + 300, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then a second line names the end of the pause, and the exit status is 75
    assert.equal(
      result.stdout,
      `requests in the last hour: 12 of 800 (this machine)\npaused until ${utcHms(NOW + 300)} (in 300 s)\n`,
    )
    assert.equal(result.exitCode, 75)
    assert.equal(server.getCalls().length, 0)
  })

  it('Ignores a pause that has ended', async () => {
    // Given a pause that ended 1 s ago
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW - 1, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then it names no pause and exits 0
    assert.equal(result.stdout, 'requests in the last hour: 0 of 800 (this machine)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Ignores a pause that ends later than its length', async () => {
    // Given a pause written while the clock ran a day ahead: it ends 86700 s from now and names a length of 300 s
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 86700, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then it names no pause and exits 0, like the call that the guard lets through
    assert.equal(result.stdout, 'requests in the last hour: 0 of 800 (this machine)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Shows a wait of 429 s as 430 s, like every other message', async () => {
    // Given a pause that ends in 429 s
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 429, 429)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then the wait reads 430 s, with the end time 1 s later
    assert.equal(
      result.stdout,
      `requests in the last hour: 0 of 800 (this machine)\npaused until ${utcHms(NOW + 430)} (in 430 s)\n`,
    )
    assert.doesNotMatch(result.stdout, /\b429\b/)
    assert.equal(result.exitCode, 75)
  })

  it('Reports no ceiling with BB_HOURLY_LIMIT=0', async () => {
    // Given 12 requests in the last hour and the ceiling off
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(12))

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '0' }) })

    // Then it prints the count with no ceiling and exits 0
    assert.equal(result.stdout, 'requests in the last hour: 12 (no ceiling)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Still reports a pause with BB_HOURLY_LIMIT=0', async () => {
    // Given a pause and the ceiling off
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 120, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '0' }) })

    // Then the pause shows and the exit status is 75
    assert.equal(
      result.stdout,
      `requests in the last hour: 0 (no ceiling)\npaused until ${utcHms(NOW + 120)} (in 120 s)\n`,
    )
    assert.equal(result.exitCode, 75)
  })

  it('Prints the same facts as JSON', async () => {
    // Given 12 requests in the last hour and no pause
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(12))

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(dir) })

    // Then stdout is one JSON object with the count, the ceiling, no pause and no wait
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 12, ceiling: 800, paused_until: null, wait_seconds: 0,
    })
    assert.equal(server.getCalls().length, 0)
  })

  it('Takes the global --json flag in front of the command too', async () => {
    // Given 2 requests in the last hour
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(2))

    // When I put --json before the command
    const result = await bb(['--json', 'rate-limit'], { port: server.port, env: env(dir) })

    // Then the output is the same JSON
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 2, ceiling: 800, paused_until: null, wait_seconds: 0,
    })
  })

  it('Gives a null ceiling in JSON with BB_HOURLY_LIMIT=0', async () => {
    // Given 12 requests in the last hour and the ceiling off
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(12))

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '0' }) })

    // Then the ceiling is null and the wait is 0
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 12, ceiling: null, paused_until: null, wait_seconds: 0,
    })
  })

  it('Gives the end of a pause and the wait in JSON, and exits 75', async () => {
    // Given a pause that ends in 300 s
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(4))
    seedPause(dir, EMAIL, NOW + 300, 300)

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(dir) })

    // Then the object names the end as epoch seconds and the wait
    assert.equal(result.exitCode, 75)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 4, ceiling: 800, paused_until: NOW + 300, wait_seconds: 300,
    })
  })

  it('Shows a wait of 429 s as 430 s in JSON too', async () => {
    // Given a pause that ends in 429 s
    const dir = stateDir()
    seedPause(dir, EMAIL, NOW + 429, 429)

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(dir) })

    // Then the wait reads 430 s and the end of the pause 1 s later, as in the text
    assert.equal(result.exitCode, 75)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 0, ceiling: 800, paused_until: NOW + 430, wait_seconds: 430,
    })
  })

  it('Gives the wait until the ceiling lets a request through in JSON', async () => {
    // Given a ceiling of 3 reached by requests 100 s, 200 s and 300 s old
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 300, NOW - 200, NOW - 100])

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the next request is possible when the oldest request leaves the hour
    assert.equal(result.exitCode, 75)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 3, ceiling: 3, paused_until: null, wait_seconds: 3600 - 300,
    })
  })

  it('Gives the longer of the pause and the ceiling wait in JSON', async () => {
    // Given a ceiling of 3 that frees a request in 3300 s, and a pause of 120 s
    const dir = stateDir()
    seedRequests(dir, EMAIL, [NOW - 300, NOW - 200, NOW - 100])
    seedPause(dir, EMAIL, NOW + 120, 300)

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: '3' }) })

    // Then the pause is named, and the wait is the longer one
    assert.equal(result.exitCode, 75)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: 3, ceiling: 3, paused_until: NOW + 120, wait_seconds: 3300,
    })
  })

  it('Keeps one count per account, whatever the case of the email', async () => {
    // Given requests recorded under a lowercase email
    const dir = stateDir()
    seedRequests(dir, EMAIL, recent(7))

    // When I run bb rate-limit as the same email with capitals
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_EMAIL: 'Test@Example.com' }) })

    // Then it reads the same count
    assert.equal(result.stdout, 'requests in the last hour: 7 of 800 (this machine)\n')
  })

  it('Counts only the requests of its own account', async () => {
    // Given requests of another account
    const dir = stateDir()
    seedRequests(dir, 'other@example.com', recent(9))
    seedPause(dir, 'other@example.com', NOW + 300, 300)

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then it shows no count and no pause
    assert.equal(result.stdout, 'requests in the last hour: 0 of 800 (this machine)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Reads a state directory with garbage in it without failing', async () => {
    // Given a request file with lines that are no epoch seconds, and a garbage pause file
    const dir = stateDir()
    mkdirSync(dir, { recursive: true })
    const lines = [...recent(2), 'not a number', '', '-5', '99999999999999999999']
    writeFileSync(requestFile(dir, EMAIL, NOW - 1), `${lines.join('\n')}\n`)
    writeFileSync(path.join(dir, `pause-${accountKey(EMAIL)}`), 'garbage here now\n')

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir) })

    // Then it counts the two real lines and names no pause
    assert.equal(result.stdout, 'requests in the last hour: 2 of 800 (this machine)\n')
    assert.equal(result.exitCode, 0)
  })

  it('Reports the unknown count and warns once when the state directory is unusable', async () => {
    // Given a state directory below a regular file
    const dir = stateDir()
    mkdirSync(path.dirname(dir), { recursive: true })
    const blocker = path.join(path.dirname(dir), 'not a directory')
    writeFileSync(blocker, 'x')
    const blocked = path.join(blocker, 'bb state')

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(blocked) })

    // Then it warns once, says that it cannot count, exits 0 and sends nothing
    assert.equal(
      result.stderr,
      `warning: bb cannot keep its request count in ${blocked}; the hourly budget is off for this call\n`,
    )
    assert.equal(result.stdout, 'requests in the last hour: unknown (no request count on this machine)\n')
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCalls().length, 0)
  })

  it('Gives null for the count in JSON when the state directory is unusable', async () => {
    // Given a state directory below a regular file
    const dir = stateDir()
    mkdirSync(path.dirname(dir), { recursive: true })
    const blocker = path.join(path.dirname(dir), 'not a directory')
    writeFileSync(blocker, 'x')

    // When I run bb rate-limit --json
    const result = await bb('rate-limit --json', { port: server.port, env: env(path.join(blocker, 'bb state')) })

    // Then the count is null, the ceiling still shows, and stdout stays pure JSON
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), {
      requests: null, ceiling: 800, paused_until: null, wait_seconds: 0,
    })
    assert.match(result.stderr, /^warning: bb cannot keep its request count in /)
  })

  it('Refuses a malformed BB_HOURLY_LIMIT like every other command', async () => {
    // Given a ceiling that is no whole number
    const dir = stateDir()

    // When I run bb rate-limit
    const result = await bb('rate-limit', { port: server.port, env: env(dir, { BB_HOURLY_LIMIT: 'many' }) })

    // Then it exits 1 with the usual error and prints nothing on stdout
    assert.equal(result.exitCode, 1)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, "error: BB_HOURLY_LIMIT must be a whole number, got 'many'\n")
  })

  it('Fails without credentials like every other command', async () => {
    // Given no email in the environment and a keychain that holds none
    const dir = stateDir()
    const bin = mkdtempSync(path.join(tmpdir(), 'bb-rate-limit-bin-'))
    try {
      writeFileSync(path.join(bin, 'security'), '#!/bin/bash\nexit 1\n')
      chmodSync(path.join(bin, 'security'), 0o755)

      // When I run bb rate-limit
      const result = await bb('rate-limit', {
        port: server.port,
        env: { ...env(dir), BB_EMAIL: '', PATH: `${bin}:${process.env.PATH ?? ''}` },
      })

      // Then it exits 1, names the fix on one line and prints nothing on stdout
      assert.equal(result.exitCode, 1)
      assert.equal(result.stdout, '')
      assert.equal(result.stderr, 'error: no email found — run: bb auth login\n')
      assert.equal(server.getCalls().length, 0)
    } finally {
      rmSync(bin, { recursive: true, force: true })
    }
  })

  it('Rejects an unknown flag', async () => {
    // When I pass a flag that bb rate-limit does not know
    const result = await bb('rate-limit --verbose', { port: server.port, env: env(stateDir()) })

    // Then it exits 1 and says so
    assert.equal(result.exitCode, 1)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, 'unknown flag: --verbose\n')
  })

  it('Rejects an argument', async () => {
    // When I pass an argument
    const result = await bb('rate-limit now', { port: server.port, env: env(stateDir()) })

    // Then it exits 1 and says so
    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, 'unknown argument: now\n')
  })

  it('Describes itself with --help and sends no request', async () => {
    // When I ask for the help of the command
    const result = await bb('rate-limit --help', { port: server.port, env: env(stateDir()) })

    // Then it prints the usage, creates no state and exits 0
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /bb rate-limit \[--json\]/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Lists rate-limit in the help', async () => {
    // When I run bb --help
    const result = await bb('--help', { port: server.port, repo: null })

    // Then the help names the command and both settings
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /rate-limit/)
    assert.match(result.stdout, /BB_HOURLY_LIMIT/)
    assert.match(result.stdout, /BB_STATE_DIR/)
  })

  it('Words exit status 75 for the ceiling and the pause in the help', async () => {
    // When I run bb --help
    const result = await bb('--help', { port: server.port, repo: null })

    // Then the exit status line names all three causes
    assert.match(
      result.stdout,
      /75 {3}rate limited: Bitbucket answered 429, bb is paused after one, or this machine reached its hourly ceiling; stderr names when to retry/,
    )
  })
})
