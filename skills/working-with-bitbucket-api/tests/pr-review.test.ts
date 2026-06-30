import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'

describe('bb pr review', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends POST /pullrequests/42/approve with --approve', async () => {
    // Given the API accepts approval
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/approve', {})

    // When I run bb pr review 42 --approve
    const result = await bb('pr review 42 --approve', { port: server.port })

    // Then it sends POST to the approve endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.match(call.path, /\/pullrequests\/42\/approve$/)
    assert.equal(result.exitCode, 0)
  })

  it('Sends POST /approve and POST /comments with --approve --comment', async () => {
    // Given the API accepts both approval and commenting
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/approve', {})
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', { id: 200, content: { raw: 'LGTM' } })

    // When I run bb pr review 42 --approve --comment "LGTM"
    const result = await bb('pr review 42 --approve --comment LGTM', { port: server.port })

    // Then it sends POST to both approve and comments endpoints
    const approveCalls = server.getCallsTo('POST', '/approve')
    assert.ok(approveCalls.length >= 1, 'Should send POST to approve')

    const commentCalls = server.getCallsTo('POST', '/comments')
    assert.ok(commentCalls.length >= 1, 'Should send POST to comments')
    const commentBody = commentCalls[0].body as Record<string, unknown>
    assert.deepEqual((commentBody.content as any).raw, 'LGTM')
    assert.equal(result.exitCode, 0)
  })

  it('Errors when neither --approve nor --comment specified', async () => {
    // When I run bb pr review 42 with no flags
    const result = await bb('pr review 42', { port: server.port })

    // Then it exits with an error about missing flags
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /specify --approve/)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows approval confirmation', async () => {
    // Given the API accepts approval
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/approve', {})

    // When I run bb pr review 42 --approve
    const result = await bb('pr review 42 --approve', { port: server.port })

    // Then it confirms the approval
    assert.equal(result.stdout, `\
Approved PR #42
`)
  })

  it('Shows approval and comment confirmation', async () => {
    // Given the API accepts both approval and commenting
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/approve', {})
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', { id: 200, content: { raw: 'LGTM' } })

    // When I run bb pr review 42 --approve --comment "LGTM"
    const result = await bb(
      ['pr', 'review', '42', '--approve', '--comment', 'LGTM'],
      { port: server.port }
    )

    // Then it confirms both the approval and the comment
    assert.equal(result.stdout, `\
Approved PR #42
Comment #200 added to PR #42
`)
  })
})
