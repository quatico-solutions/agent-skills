import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prTasks from './fixtures/pr-tasks.json' with { type: 'json' }

describe('bb pr tasks', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends GET /tasks to list tasks', async () => {
    // Given the API returns tasks for the PR
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/tasks', prTasks)

    // When I run bb pr tasks 42
    const result = await bb('pr tasks 42', { port: server.port })

    // Then it sends GET to the tasks endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests\/42\/tasks$/)
    assert.equal(result.exitCode, 0)
  })

  it('Sends PUT with state:RESOLVED for --resolve', async () => {
    // Given the API accepts the task update
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42/tasks/200', {})

    // When I run bb pr tasks 42 --resolve 200
    const result = await bb('pr tasks 42 --resolve 200', { port: server.port })

    // Then it sends PUT with RESOLVED state
    const call = server.getLastCall()
    assert.equal(call.method, 'PUT')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests\/42\/tasks\/200$/)
    const body = call.body as Record<string, unknown>
    assert.equal(body.state, 'RESOLVED')
    assert.equal(result.exitCode, 0)
  })

  it('Sends PUT with state:UNRESOLVED for --reopen', async () => {
    // Given the API accepts the task update
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42/tasks/201', {})

    // When I run bb pr tasks 42 --reopen 201
    const result = await bb('pr tasks 42 --reopen 201', { port: server.port })

    // Then it sends PUT with UNRESOLVED state
    const call = server.getLastCall()
    assert.equal(call.method, 'PUT')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests\/42\/tasks\/201$/)
    const body = call.body as Record<string, unknown>
    assert.equal(body.state, 'UNRESOLVED')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('list with tasks', async () => {
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/tasks', prTasks)
    const result = await bb('pr tasks 42', { port: server.port })
    assert.equal(result.stdout, `\
ID   STATE   CREATOR   TEXT
200  UNRESOLVED  Bob Jones  Fix the error handling
201  RESOLVED    Bob Jones  Add tests
`)
  })

  it('empty task list', async () => {
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/tasks', { values: [] })
    const result = await bb('pr tasks 42', { port: server.port })
    assert.equal(result.stdout, `\
No tasks on PR #42
`)
  })

  it('resolve task', async () => {
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42/tasks/101', {})
    const result = await bb('pr tasks 42 --resolve 101', { port: server.port })
    assert.equal(result.stdout, `\
Resolved task #101 on PR #42
`)
  })

  it('reopen task', async () => {
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42/tasks/101', {})
    const result = await bb('pr tasks 42 --reopen 101', { port: server.port })
    assert.equal(result.stdout, `\
Reopened task #101 on PR #42
`)
  })
})
