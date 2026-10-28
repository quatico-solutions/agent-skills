import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { closedPort } from './closed-port.ts'
import user from './fixtures/user.json' with { type: 'json' }

describe('bb auth status', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends GET /user', async () => {
    // Given the API returns a user object
    server.stub('GET', '/user', user)

    // When I run bb auth status
    const result = await bb('auth status', { port: server.port })

    // Then it sends GET /user
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.equal(call.path, '/user')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs valid JSON with --json', async () => {
    // Given the API returns a user object
    server.stub('GET', '/user', user)

    // When I run bb auth status --json
    const result = await bb('auth status --json', { port: server.port })

    // Then stdout is valid JSON with expected fields
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.display_name, 'Test User')
    assert.equal(parsed.username, 'testuser')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows user info', async () => {
    // Given the user is authenticated
    server.stub('GET', '/user', user)

    // When I run bb auth status
    const result = await bb('auth status', { port: server.port })

    // Then it shows display name, account ID, and UUID
    assert.equal(result.stdout, `\
Logged in as: Test User (testuser)
Account ID:   557058:abcdef01-2345-6789-abcd-ef0123456789
UUID:         {abcdef01-2345-6789-abcd-ef0123456789}
`)
  })
})

describe('transport failure', () => {
  it('Exits 1 with "no response" when nothing listens on the API port', async () => {
    // Given no server listens on the API port
    const port = await closedPort()

    // When I run bb auth status
    const result = await bb('auth status', { port })

    // Then bb exits 1 and prints nothing on stdout
    assert.equal(result.exitCode, 1)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /error: no response from Bitbucket/)
  })
})
