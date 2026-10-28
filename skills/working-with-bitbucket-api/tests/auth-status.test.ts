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
    assert.equal(parsed.nickname, 'testuser')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows nickname, display name, account ID and credential source', async () => {
    // Given the user is authenticated through BB_TOKEN
    server.stub('GET', '/user', user)

    // When I run bb auth status
    const result = await bb('auth status', { port: server.port })

    // Then it shows one fact per line
    assert.equal(result.stdout, `\
nickname: testuser
display_name: Test User
account_id: 557058:abcdef01-2345-6789-abcd-ef0123456789
credentials: BB_TOKEN env
`)
  })
})

describe('bb whoami', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Prints the same four lines as bb auth status', async () => {
    // Given the user is authenticated
    server.stub('GET', '/user', user)

    // When I run bb whoami
    const result = await bb('whoami', { port: server.port })

    // Then it prints nickname, display_name, account_id and credentials
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
nickname: testuser
display_name: Test User
account_id: 557058:abcdef01-2345-6789-abcd-ef0123456789
credentials: BB_TOKEN env
`)
  })

  it('Prefers .nickname over .username', async () => {
    // Given /user carries a nickname that differs from the username
    server.stub('GET', '/user', { ...user, nickname: 'Test Nick' })

    // When I run bb whoami
    const result = await bb('whoami', { port: server.port })

    // Then the nickname line shows .nickname
    assert.match(result.stdout, /^nickname: Test Nick$/m)
  })

  it('Never prints the token or the email', async () => {
    // Given the user is authenticated with a known token and email
    server.stub('GET', '/user', user)

    // When I run bb whoami in text and JSON mode
    const text = await bb('whoami', { port: server.port })
    const json = await bb('whoami --json', { port: server.port })

    // Then neither output nor stderr contains them
    for (const r of [text, json]) {
      assert.ok(!(r.stdout + r.stderr).includes('fake-test-token'))
      assert.ok(!(r.stdout + r.stderr).includes('@'))
    }
  })

  it('Prints exactly five keys with --json', async () => {
    // Given the user is authenticated
    server.stub('GET', '/user', user)

    // When I run bb whoami --json
    const result = await bb('whoami --json', { port: server.port })

    // Then stdout is the projection, not the raw /user body
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), {
      nickname: 'testuser',
      display_name: 'Test User',
      account_id: '557058:abcdef01-2345-6789-abcd-ef0123456789',
      uuid: '{abcdef01-2345-6789-abcd-ef0123456789}',
      credentials: 'BB_TOKEN env',
    })
  })

  it('Exits 1 with one stderr line on 401', async () => {
    // Given the API rejects the credentials
    server.stub('GET', '/user', { error: { message: 'bad' } }, 401)

    // When I run bb whoami
    const result = await bb('whoami', { port: server.port })

    // Then it exits 1, prints nothing on stdout and one line on stderr
    assert.equal(result.exitCode, 1)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr.trim().split('\n').length, 1)
  })

  it('Exits 1 when nothing listens on the API port', async () => {
    // Given no server listens on the API port
    const port = await closedPort()

    // When I run bb whoami
    const result = await bb('whoami', { port })

    // Then bb exits 1
    assert.equal(result.exitCode, 1)
    assert.equal(result.stdout, '')
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
