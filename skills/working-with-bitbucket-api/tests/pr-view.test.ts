import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prSingle from './fixtures/pr-single.json' with { type: 'json' }
import prComments from './fixtures/pr-comments.json' with { type: 'json' }

describe('bb pr view', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends GET /repositories/testws/testrepo/pullrequests/42', async () => {
    // Given the API returns a single PR
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr view 42
    const result = await bb('pr view 42', { port: server.port })

    // Then it sends GET to the correct PR endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.equal(call.path, '/repositories/testws/testrepo/pullrequests/42')
    assert.equal(result.exitCode, 0)
  })

  it('Also fetches comments with --comments', async () => {
    // Given the API returns a PR and paginated comments
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/comments', prComments)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr view 42 --comments
    const result = await bb('pr view 42 --comments', { port: server.port })

    // Then it fetches both the PR and its comments
    const prCalls = server.getCallsTo('GET', '/pullrequests/42')
    assert.ok(prCalls.length >= 1, 'Should fetch the PR')
    const commentCalls = server.getCallsTo('GET', '/pullrequests/42/comments')
    assert.ok(commentCalls.length >= 1, 'Should fetch comments')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs valid JSON with --json', async () => {
    // Given the API returns a single PR
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr view 42 --json
    const result = await bb('pr view 42 --json', { port: server.port })

    // Then stdout is valid JSON with the PR data
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.id, 42)
    assert.equal(parsed.title, 'Add login feature')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows PR details', async () => {
    // Given the API returns a single PR
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr view 42
    const result = await bb('pr view 42', { port: server.port })

    // Then it shows formatted PR details
    assert.equal(result.stdout, `\
Title:    Add login feature
State:    OPEN
Author:   Alice Smith
Source:   feature/login
Dest:     main
Created:  2025-01-15T10:00:00.000000+00:00
Updated:  2025-01-15T12:00:00.000000+00:00
URL:      https://bitbucket.org/testws/testrepo/pull-requests/42

Reviewers:
  - Bob Jones

---

Adds login page with OAuth support
`)
  })

  it('Shows DRAFT state for draft PRs', async () => {
    // Given a draft PR
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', { ...prSingle, draft: true })

    // When I run bb pr view 42
    const result = await bb('pr view 42', { port: server.port })

    // Then it shows DRAFT instead of OPEN
    assert.match(result.stdout, /State:\s+DRAFT/)
    assert.ok(!result.stdout.includes('State:    OPEN'), 'Should show DRAFT, not OPEN')
  })

  it('Shows PR details with comments', async () => {
    // Given the API returns a PR and its comments
    // Register generic PR stub FIRST, specific comments stub SECOND (LIFO: last wins)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/comments', prComments)

    // When I run bb pr view 42 --comments
    const result = await bb('pr view 42 --comments', { port: server.port })

    // Then it shows PR details followed by a comments table
    assert.equal(result.stdout, `\
Title:    Add login feature
State:    OPEN
Author:   Alice Smith
Source:   feature/login
Dest:     main
Created:  2025-01-15T10:00:00.000000+00:00
Updated:  2025-01-15T12:00:00.000000+00:00
URL:      https://bitbucket.org/testws/testrepo/pull-requests/42

Reviewers:
  - Bob Jones

---

Adds login page with OAuth support

Comments:
ID   AUTHOR   DATE   LOCATION   TEXT
100  Bob Jones    2025-01-15  general               Looks good to me
101  Alice Smith  2025-01-15  inline:src/auth.ts:5  Needs a fix on line 5
`)
  })
})
