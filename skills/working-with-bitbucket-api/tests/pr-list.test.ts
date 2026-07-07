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

describe('bb pr list --json <fields> / --jq', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Projects a single gh-style field', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request only headRefName
    const result = await bb('pr list --json headRefName', { port: server.port })

    // Then each element is an object with exactly that key, mapped from the BB path
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [
      { headRefName: 'feature/login' },
      { headRefName: 'fix/readme-typo' },
    ])
  })

  it('Projects multiple fields with mapped values', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request number,headRefName,isDraft
    const result = await bb('pr list --json number,headRefName,isDraft', { port: server.port })

    // Then each element has exactly those keys
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [
      { number: 42, headRefName: 'feature/login', isDraft: false },
      { number: 43, headRefName: 'fix/readme-typo', isDraft: false },
    ])
  })

  it('Mirrors gh author shape ({login})', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request author
    const result = await bb('pr list --json author', { port: server.port })

    // Then author is an object with a login key (from .author.nickname)
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [
      { author: { login: 'alice' } },
      { author: { login: 'bob' } },
    ])
  })

  it('Passes JSON through --jq (acceptance: one branch per line)', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run the forge-portable acceptance command
    const result = await bb(
      ['pr', 'list', '--state', 'open', '--json', 'headRefName', '--jq', '.[].headRefName'],
      { port: server.port }
    )

    // Then stdout is one raw branch name per line
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, 'feature/login\nfix/readme-typo\n')
  })

  it('Rejects an unknown field', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request a field that does not exist
    const result = await bb('pr list --json bogus', { port: server.port })

    // Then it exits 1 and names the supported fields on stderr
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /unknown field 'bogus'/)
    assert.match(result.stderr, /headRefName/)
  })

  it('Rejects --jq without --json', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I use --jq without --json
    const result = await bb(['pr', 'list', '--jq', '.'], { port: server.port })

    // Then it exits 1 with a clear message
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--jq requires --json/)
  })

  it('Bare --json still emits full objects (regression)', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bare --json
    const result = await bb('pr list --json', { port: server.port })

    // Then the full Bitbucket objects are returned unchanged (nested paths intact)
    const parsed = JSON.parse(result.stdout)
    assert.equal(result.exitCode, 0)
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].source.branch.name, 'feature/login')
    assert.equal(parsed[0].id, 42)
  })
})
