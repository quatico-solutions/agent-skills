import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prSingle from './fixtures/pr-single.json' with { type: 'json' }

describe('bb pr merge', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends POST /merge with merge_strategy:"merge_commit" by default', async () => {
    // Given the API accepts the merge
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/merge', prSingle)

    // When I run bb pr merge 42
    const result = await bb('pr merge 42', { port: server.port })

    // Then it sends POST with merge_commit strategy
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.match(call.path, /\/pullrequests\/42\/merge$/)
    const body = call.body as Record<string, unknown>
    assert.equal(body.merge_strategy, 'merge_commit')
    assert.equal(result.exitCode, 0)
  })

  it('Sends merge_strategy:"squash" with --squash', async () => {
    // Given the API accepts the merge
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/merge', prSingle)

    // When I run bb pr merge 42 --squash
    const result = await bb('pr merge 42 --squash', { port: server.port })

    // Then it sends POST with squash strategy
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    assert.equal(body.merge_strategy, 'squash')
    assert.equal(result.exitCode, 0)
  })

  it('Sends close_source_branch:true with --delete-branch', async () => {
    // Given the API accepts the merge
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/merge', prSingle)

    // When I run bb pr merge 42 --delete-branch
    const result = await bb('pr merge 42 --delete-branch', { port: server.port })

    // Then it sends POST with close_source_branch: true
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    assert.equal(body.close_source_branch, true)
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('default merge', async () => {
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/merge', {})
    const result = await bb('pr merge 42', { port: server.port })
    assert.equal(result.stdout, `\
Merged PR #42 (strategy: merge)
`)
  })

  it('squash merge', async () => {
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/merge', {})
    const result = await bb('pr merge 42 --squash', { port: server.port })
    assert.equal(result.stdout, `\
Merged PR #42 (strategy: squash)
`)
  })
})
