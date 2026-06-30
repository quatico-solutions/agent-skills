import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import user from './fixtures/user.json' with { type: 'json' }
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }

describe('bb pr status', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Fetches /user and /pullrequests with state=OPEN', async () => {
    // Given the API returns the current user and open PRs
    server.stub('GET', '/user', user)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr status
    const result = await bb('pr status', { port: server.port })

    // Then it sends GET /user to identify the current user
    const userCalls = server.getCallsTo('GET', '/user')
    assert.ok(userCalls.length >= 1, 'Should fetch current user')

    // Then it sends GET /pullrequests with state=OPEN
    const prCalls = server.getCallsTo('GET', '/pullrequests')
    assert.ok(prCalls.length >= 1, 'Should fetch pull requests')
    const prCall = prCalls.find(c => c.path.includes('/repositories/'))
    assert.ok(prCall, 'Should fetch from repositories endpoint')
    assert.equal(prCall.query.state, 'OPEN')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json', async () => {
    // Given the API returns the current user and open PRs
    server.stub('GET', '/user', user)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr status --json
    const result = await bb('pr status --json', { port: server.port })

    // Then stdout is valid JSON with authored and reviewing arrays
    const parsed = JSON.parse(result.stdout)
    assert.ok('authored' in parsed, 'JSON should have "authored" key')
    assert.ok('reviewing' in parsed, 'JSON should have "reviewing" key')
    assert.ok(Array.isArray(parsed.authored), 'authored should be an array')
    assert.ok(Array.isArray(parsed.reviewing), 'reviewing should be an array')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('authored and reviewing PRs', async () => {
    server.stub('GET', '/user', user)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', {
      values: [
        {
          id: 42, title: 'Add login page', state: 'OPEN', draft: false,
          author: { account_id: '557058:abcdef01-2345-6789-abcd-ef0123456789', display_name: 'Test User', nickname: 'testuser' },
          source: { branch: { name: 'feature/login' } },
          destination: { branch: { name: 'main' } },
          reviewers: []
        },
        {
          id: 99, title: 'Fix typo in README', state: 'OPEN', draft: false,
          author: { account_id: 'other-account', display_name: 'Alice', nickname: 'alice' },
          source: { branch: { name: 'fix/readme' } },
          destination: { branch: { name: 'main' } },
          reviewers: [{ account_id: '557058:abcdef01-2345-6789-abcd-ef0123456789' }]
        }
      ],
      page: 1, size: 2
    })
    const result = await bb('pr status', { port: server.port })
    assert.equal(result.stdout, `\
Authored (1):
ID   STATE   AUTHOR   BRANCH   TITLE
42  OPEN  Test User  feature/login  Add login page

Reviewing (1):
ID   STATE   AUTHOR   BRANCH   TITLE
99  OPEN  Alice  fix/readme  Fix typo in README
`)
  })

  it('empty status', async () => {
    server.stub('GET', '/user', user)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })
    const result = await bb('pr status', { port: server.port })
    assert.equal(result.stdout, `\
Authored (0):
  (none)

Reviewing (0):
  (none)
`)
  })
})
