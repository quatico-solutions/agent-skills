import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import user from './fixtures/user.json' with { type: 'json' }

// Global flags and dispatch are parsed before any subcommand: -R, --version/-v,
// the top-level --json, help, and unknown-command handling.
describe('bb global flags', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  const INSTALL = 'quatico-bb — brew install quatico-solutions/tap/quatico-bb'
  const bbVersion = readFileSync(new URL('../../../cli/bb', import.meta.url), 'utf8')
    .match(/^BB_VERSION="([^"]+)"/m)![1]

  for (const flag of ['--version', '-v']) {
    it(`Prints the version and install source with ${flag}`, async () => {
      const result = await bb(flag, { port: server.port })
      const line = result.stdout.trimEnd()

      // Then the line is "bb <version> (<package> — <install command>)"
      assert.equal(result.exitCode, 0)
      assert.equal(line, `bb ${bbVersion} (${INSTALL})`)
      assert.equal(line.split(' ').slice(0, 2).join(' '), `bb ${bbVersion}`)
    })

    // Plot's bb_identify reads the first X.Y.Z as the version, treats a pure-hex
    // parenthesis as craftamap's bb, and the word "quatico" as Quatico's.
    it(`Keeps ${flag} readable by Plot's bb_identify`, async () => {
      const result = await bb(flag, { port: server.port })
      const line = result.stdout.trimEnd()

      assert.equal(line.match(/\d+\.\d+\.\d+/g)?.length, 1)
      assert.doesNotMatch(line, /\([0-9a-f]+\)/)
      assert.match(line, /quatico/)
    })
  }

  it('Validates -R requires workspace/repo format', async () => {
    // When -R is given without a slash
    const result = await bb(['-R', 'norepo', 'auth', 'status'], { port: server.port })

    // Then it errors and makes no request
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /-R requires workspace\/repo format/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Honors a top-level --json before the subcommand', async () => {
    // Given the API returns a user
    server.stub('GET', '/user', user)

    // When --json precedes the subcommand
    const result = await bb('--json auth status', { port: server.port })

    // Then output is JSON (the global flag set JSON_OUTPUT)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.username, 'testuser')
    assert.equal(result.exitCode, 0)
  })

  it('Errors on an unknown top-level command', async () => {
    const result = await bb('frobnicate', { port: server.port })
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown command/)
  })

  it('Errors on an unknown pr subcommand', async () => {
    const result = await bb('pr frobnicate', { port: server.port })
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown pr command/)
  })

  it('Errors on an unknown source subcommand', async () => {
    const result = await bb('source frobnicate', { port: server.port })
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown source command/)
  })

  it('Prints usage with help', async () => {
    const result = await bb('help', { port: server.port })
    assert.match(result.stdout, /bb — Bitbucket Cloud CLI/)
    assert.equal(result.exitCode, 0)
  })

  it('Names the package and install command on the first line of help', async () => {
    const result = await bb('--help', { port: server.port })
    const first = result.stdout.split('\n')[0]
    assert.match(first, /quatico-bb/)
    assert.ok(first.includes('brew install quatico-solutions/tap/quatico-bb'))
  })

  it('Rejects a non-loopback BB_API_URL (credential-exfiltration guard)', async () => {
    // When BB_API_URL points to a remote host, bb must refuse rather than
    // send HTTP Basic credentials off-box.
    const result = await bb('auth status', {
      port: server.port,
      env: { BB_API_URL: 'https://evil.example.com' },
    })

    // Then it errors and makes no request
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /must point to a loopback host/)
    assert.equal(server.getCalls().length, 0)
  })
})
