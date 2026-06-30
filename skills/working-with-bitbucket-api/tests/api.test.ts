import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import user from './fixtures/user.json' with { type: 'json' }
import prCreateResponse from './fixtures/pr-create-response.json' with { type: 'json' }

// `bb api` is the raw escape hatch: it forwards a path/method/body straight to
// the Bitbucket API with auth attached, and pretty-prints the JSON response.
describe('bb api', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends a GET to the given path by default', async () => {
    // Given the API has a user endpoint
    server.stub('GET', '/user', user)

    // When I call bb api /user
    const result = await bb('api /user', { port: server.port })

    // Then it sends GET /user
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.equal(call.path, '/user')
    assert.equal(result.exitCode, 0)
  })

  it('Sends the chosen method with --method (case-insensitive)', async () => {
    // Given the API accepts a POST decline
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/decline', {})

    // When I call bb api with a lowercase method
    const result = await bb(
      ['api', '/repositories/testws/testrepo/pullrequests/42/decline', '--method', 'post'],
      { port: server.port }
    )

    // Then the method is upper-cased to POST
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.equal(call.path, '/repositories/testws/testrepo/pullrequests/42/decline')
    assert.equal(result.exitCode, 0)
  })

  it('Sends a JSON request body with --data', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I call bb api with --data
    const result = await bb(
      ['api', '/repositories/testws/testrepo/pullrequests', '--method', 'POST', '--data', '{"title":"Raw"}'],
      { port: server.port }
    )

    // Then the body is forwarded verbatim
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    const body = call.body as Record<string, unknown>
    assert.equal(body.title, 'Raw')
    assert.equal(result.exitCode, 0)
  })

  it('Expands {ws} and {repo} path shortcuts', async () => {
    // Given the API has a repo endpoint
    server.stub('GET', '/repositories/testws/testrepo', { name: 'testrepo' })

    // When I call bb api with shortcuts
    const result = await bb('api /repositories/{ws}/{repo}', { port: server.port })

    // Then the shortcuts are replaced with the -R workspace/repo
    const call = server.getLastCall()
    assert.equal(call.path, '/repositories/testws/testrepo')
    assert.equal(result.exitCode, 0)
  })

  it('Pretty-prints the JSON response', async () => {
    // Given the API returns a user
    server.stub('GET', '/user', user)

    // When I call bb api /user
    const result = await bb('api /user', { port: server.port })

    // Then stdout is the parsed JSON (indented by jq)
    assert.equal(JSON.parse(result.stdout).username, 'testuser')
    assert.match(result.stdout, /\n  "username": "testuser"/)
  })

  it('Errors when no path is given', async () => {
    // When I call bb api with no path
    const result = await bb('api', { port: server.port })

    // Then it prints usage and exits non-zero
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /usage: bb api/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Rejects unknown flags', async () => {
    // When I pass an unknown flag
    const result = await bb('api /user --bogus', { port: server.port })

    // Then it errors
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown flag/)
  })

  it('Surfaces HTTP errors from the API (shared bb_api_call path)', async () => {
    // Given the API returns a 500 with an error message
    server.stub('GET', '/repositories/testws/testrepo', { error: { message: 'boom' } }, 500)

    // When I make a call that hits that endpoint
    const result = await bb('api /repositories/testws/testrepo', { port: server.port })

    // Then bb surfaces the status and message, and exits non-zero
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /HTTP 500/)
    assert.match(result.stderr, /boom/)
  })
})
