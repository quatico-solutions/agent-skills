import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'

describe('bb pr close', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends POST /decline to close the PR', async () => {
    // Given the API accepts the decline
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/decline', {})

    // When I run bb pr close 42
    const result = await bb('pr close 42', { port: server.port })

    // Then it sends POST to the decline endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests\/42\/decline$/)
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('close confirmation', async () => {
    server.stub('POST', '/repositories/testws/testrepo/pullrequests/42/decline', {})
    const result = await bb('pr close 42', { port: server.port })
    assert.equal(result.stdout, `\
Closed PR #42
`)
  })
})
