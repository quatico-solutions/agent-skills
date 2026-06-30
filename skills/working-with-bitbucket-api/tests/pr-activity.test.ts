import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prActivity from './fixtures/pr-activity.json' with { type: 'json' }

describe('bb pr activity', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Paginates /activity for the PR', async () => {
    // Given the API returns activity data (paginated)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/activity', prActivity)

    // When I run bb pr activity 42
    const result = await bb('pr activity 42', { port: server.port })

    // Then it sends GET to the activity endpoint
    const calls = server.getCallsTo('GET', '/pullrequests/42/activity')
    assert.ok(calls.length >= 1, 'Should fetch activity')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('activity with entries', async () => {
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/activity', prActivity)
    const result = await bb('pr activity 42', { port: server.port })
    assert.equal(result.stdout, `\
DATE   TYPE   AUTHOR   SUMMARY
2025-01-15  update    Alice Smith  OPEN
2025-01-15  approval  Bob Jones    approved
`)
  })

  it('empty activity', async () => {
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/activity', { values: [], page: 1, size: 0 })
    const result = await bb('pr activity 42', { port: server.port })
    assert.equal(result.stdout, `\
No activity on PR #42
`)
  })
})
