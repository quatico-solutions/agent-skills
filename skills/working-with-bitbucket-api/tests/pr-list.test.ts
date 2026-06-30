import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }
import prListMerged from './fixtures/pr-list-merged.json' with { type: 'json' }

describe('bb pr list', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Lists open PRs by default', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then it sends GET with state=OPEN
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests/)
    assert.equal(call.query.state, 'OPEN')
    assert.equal(result.exitCode, 0)
  })

  it('Filters by --state merged', async () => {
    // Given bitbucket has merged pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListMerged)

    // When I run bb pr list --state merged
    const result = await bb('pr list --state merged', { port: server.port })

    // Then it sends state=MERGED
    const call = server.getLastCall()
    assert.equal(call.query.state, 'MERGED')
    assert.equal(result.exitCode, 0)
  })

  it('Filters by --author with server-side nickname query', async () => {
    // Given bitbucket has PRs by alice
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list --author alice
    const result = await bb('pr list --author alice', { port: server.port })

    // Then the query contains author.nickname filter
    const call = server.getLastCall()
    assert.match(call.url, /author\.nickname/)
    assert.match(call.url, /alice/)
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list --json
    const result = await bb('pr list --json', { port: server.port })

    // Then stdout is valid JSON
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.equal(result.exitCode, 0)
  })

  it('Falls back to client-side display_name filter when nickname returns empty', async () => {
    // Given the nickname-filtered query returns nothing (generic stub catches ?q=... calls)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })
    // The fallback call uses ?state=OPEN (query-matched stub wins over generic)
    server.stubWithQuery('GET', '/repositories/testws/testrepo/pullrequests',
      { state: 'OPEN' }, prListOpen)

    // When I run bb pr list --author "Alice Smith"
    const result = await bb(
      ['pr', 'list', '--author', 'Alice Smith'],
      { port: server.port }
    )

    // Then it makes two GET calls (first nickname filter, then fallback)
    const prCalls = server.getCallsTo('GET', '/pullrequests')
    assert.ok(prCalls.length >= 2, `Should make at least 2 calls to /pullrequests, got ${prCalls.length}`)
    // And it succeeds (found results via fallback display_name match)
    assert.equal(result.exitCode, 0)
    // Output should contain Alice Smith's PR
    assert.match(result.stdout, /Alice Smith/)
  })

  it('Uppercases --state value', async () => {
    // Given bitbucket has declined pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })

    // When I run bb pr list --state declined (lowercase)
    const result = await bb('pr list --state declined', { port: server.port })

    // Then it sends state=DECLINED (uppercase)
    const call = server.getLastCall()
    assert.equal(call.query.state, 'DECLINED')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows tabular PR list', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then it shows a header row and one row per PR
    assert.equal(result.stdout, `\
ID   STATE   AUTHOR   BRANCH   TITLE
42  OPEN  Alice Smith  feature/login    Add login feature
43  OPEN  Bob Jones    fix/readme-typo  Fix typo in README
`)
  })

  it('Shows DRAFT state for draft PRs', async () => {
    // Given a PR list where one PR is a draft
    const draftList = {
      values: [
        {
          id: 50, title: 'WIP: new feature', state: 'OPEN', draft: true,
          author: { display_name: 'Alice Smith', nickname: 'alice' },
          source: { branch: { name: 'feature/wip' } },
          destination: { branch: { name: 'main' } },
          reviewers: []
        }
      ],
      page: 1, size: 1
    }
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', draftList)

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then the output shows DRAFT instead of OPEN
    assert.match(result.stdout, /DRAFT/)
    assert.ok(!result.stdout.includes('OPEN'), 'Should show DRAFT, not OPEN')
  })

  it('Shows empty state message', async () => {
    // Given bitbucket has no matching pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then it shows the empty state message
    assert.equal(result.stdout, `\
No pull requests match the query
`)
  })
})
