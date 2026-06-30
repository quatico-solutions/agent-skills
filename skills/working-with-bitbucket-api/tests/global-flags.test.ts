import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
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

  it('Prints the version with --version', async () => {
    const result = await bb('--version', { port: server.port })
    assert.match(result.stdout, /^bb \d+\.\d+\.\d+\n$/)
    assert.equal(result.exitCode, 0)
  })

  it('Prints the version with -v', async () => {
    const result = await bb('-v', { port: server.port })
    assert.match(result.stdout, /^bb \d+\.\d+\.\d+\n$/)
    assert.equal(result.exitCode, 0)
  })

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
