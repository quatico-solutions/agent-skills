import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import user from './fixtures/user.json' with { type: 'json' }

// `bb auth login` validates the token against GET /user, then stores it in the
// macOS Keychain. Tests run non-interactively (stdin is a pipe, not a tty) and
// shim `security` so the success path never touches the real Keychain.
const shimBin = fileURLToPath(new URL('./fixtures/bin', import.meta.url))
const withShim = { PATH: `${shimBin}:${process.env.PATH ?? ''}` }

describe('bb auth login', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Validates the token against GET /user with the supplied credentials', async () => {
    // Given the API accepts the credentials
    server.stub('GET', '/user', user)

    // When I log in non-interactively with a piped token
    const result = await bb(['auth', 'login', '--email', 'alice@example.com'], {
      port: server.port,
      input: 'my-api-token\n',
      env: withShim,
    })

    // Then it validates by calling GET /user with HTTP Basic auth
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.equal(call.path, '/user')
    const expectedAuth = 'Basic ' + Buffer.from('alice@example.com:my-api-token').toString('base64')
    assert.equal(call.headers.authorization, expectedAuth)
    assert.equal(result.exitCode, 0)
  })

  it('Reports the logged-in user on success', async () => {
    // Given the API accepts the credentials
    server.stub('GET', '/user', user)

    // When I log in
    const result = await bb(['auth', 'login', '--email', 'alice@example.com'], {
      port: server.port,
      input: 'my-api-token\n',
      env: withShim,
    })

    // Then it confirms the identity and that the token was stored
    assert.equal(result.stdout, `\
Logged in as Test User (testuser)
Token stored in keychain.
`)
  })

  it('Fails when the token is rejected (HTTP 401)', async () => {
    // Given the API rejects the credentials
    server.stub('GET', '/user', { error: { message: 'invalid token' } }, 401)

    // When I log in with a bad token
    const result = await bb(['auth', 'login', '--email', 'alice@example.com'], {
      port: server.port,
      input: 'bad-token\n',
      env: withShim,
    })

    // Then it errors and does not proceed to store anything
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /authentication failed \(HTTP 401\)/)
  })

  it('Requires --email in non-interactive mode', async () => {
    // When I log in without --email and no tty
    const result = await bb(['auth', 'login'], {
      port: server.port,
      input: 'some-token\n',
      env: withShim,
    })

    // Then it errors before making any request
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /--email required in non-interactive mode/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Errors when an empty token is provided on stdin', async () => {
    // When I log in with --email but submit an empty line (no token)
    const result = await bb(['auth', 'login', '--email', 'alice@example.com'], {
      port: server.port,
      input: '\n',
      env: withShim,
    })

    // Then it errors that no token was provided
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /no token provided/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Rejects unknown flags', async () => {
    // When I pass an unknown flag
    const result = await bb(['auth', 'login', '--bogus'], {
      port: server.port,
      env: withShim,
    })

    // Then it errors
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown flag/)
  })
})
