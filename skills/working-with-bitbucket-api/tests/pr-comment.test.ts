import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'

const commentResponse = { id: 102, content: { raw: 'test' } }

describe('bb pr comment', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends POST with content.raw for a simple comment', async () => {
    // Given the API accepts comment creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', commentResponse)

    // When I run bb pr comment 42 --body LGTM
    const result = await bb('pr comment 42 --body LGTM', { port: server.port })

    // Then it sends POST with the comment body
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.match(call.path, /\/pullrequests\/42\/comments$/)
    const body = call.body as Record<string, unknown>
    assert.deepEqual((body.content as any).raw, 'LGTM')
    assert.equal(result.exitCode, 0)
  })

  it('Sends inline location with --file and --line', async () => {
    // Given the API accepts comment creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', commentResponse)

    // When I run bb pr comment with --file and --line
    const result = await bb('pr comment 42 --body FixThis --file src/auth.ts --line 15', { port: server.port })

    // Then the payload includes inline location
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    assert.deepEqual((body.content as any).raw, 'FixThis')
    const inline = body.inline as Record<string, unknown>
    assert.equal(inline.path, 'src/auth.ts')
    assert.equal(inline.to, 15)
    assert.equal(result.exitCode, 0)
  })

  it('Sends file-level inline comment with --file but no --line', async () => {
    // Given the API accepts comment creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', commentResponse)

    // When I run bb pr comment with --file but no --line
    const result = await bb(
      ['pr', 'comment', '42', '--body', 'Fix', '--file', 'src/auth.ts'],
      { port: server.port }
    )

    // Then payload has inline.path but no inline.to
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    const inline = body.inline as Record<string, unknown>
    assert.equal(inline.path, 'src/auth.ts')
    assert.ok(!('to' in inline), 'Should NOT have inline.to for file-level comment')
    assert.equal(result.exitCode, 0)
  })

  it('Errors when --line given without --file', async () => {
    // Given the API would accept comments (but we should never get there)
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', commentResponse)

    // When I run bb pr comment with --line but no --file
    const result = await bb('pr comment 42 --body Fix --line 15', { port: server.port })

    // Then it exits with an error (--line requires --file)
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /--line requires --file/)
  })

  it('Sends POST to /resolve with --resolve', async () => {
    // Given the API accepts comment resolution
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments/100/resolve', {})

    // When I run bb pr comment 42 --resolve 100
    const result = await bb('pr comment 42 --resolve 100', { port: server.port })

    // Then it sends POST to the resolve endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.match(call.path, /\/comments\/100\/resolve$/)
    assert.equal(result.exitCode, 0)
  })

  it('Sends DELETE to /resolve with --unresolve', async () => {
    // Given the API accepts comment unresolution
    server.stub('DELETE', '/repositories/testws/testrepo/pullrequests/42/comments/100/resolve', {})

    // When I run bb pr comment 42 --unresolve 100
    const result = await bb('pr comment 42 --unresolve 100', { port: server.port })

    // Then it sends DELETE to the resolve endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'DELETE')
    assert.match(call.path, /\/comments\/100\/resolve$/)
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows new comment confirmation', async () => {
    // Given the API accepts comment creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', { id: 100, content: { raw: 'Nice!' } })

    // When I run bb pr comment 42 --body Nice!
    const result = await bb('pr comment 42 --body Nice!', { port: server.port })

    // Then it confirms the comment was added
    assert.equal(result.stdout, `\
Comment #100 added to PR #42
`)
  })

  it('Shows inline comment confirmation', async () => {
    // Given the API accepts inline comment creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments', { id: 101, content: { raw: 'Fix this' } })

    // When I run bb pr comment 42 with --file and --line
    const result = await bb(
      ['pr', 'comment', '42', '--body', 'Fix this', '--file', 'src/auth.ts', '--line', '5'],
      { port: server.port }
    )

    // Then it confirms the comment was added
    assert.equal(result.stdout, `\
Comment #101 added to PR #42
`)
  })

  it('Shows resolve confirmation', async () => {
    // Given the API accepts comment resolution
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/comments/100/resolve', {})

    // When I run bb pr comment 42 --resolve 100
    const result = await bb('pr comment 42 --resolve 100', { port: server.port })

    // Then it confirms the comment was resolved
    assert.equal(result.stdout, `\
Resolved comment #100 on PR #42
`)
  })

  it('Shows unresolve confirmation', async () => {
    // Given the API accepts comment unresolution
    server.stub('DELETE', '/repositories/testws/testrepo/pullrequests/42/comments/100/resolve', {})

    // When I run bb pr comment 42 --unresolve 100
    const result = await bb('pr comment 42 --unresolve 100', { port: server.port })

    // Then it confirms the comment was unresolved
    assert.equal(result.stdout, `\
Unresolved comment #100 on PR #42
`)
  })
})
