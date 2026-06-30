import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import searchResults from './fixtures/search-results.json' with { type: 'json' }

describe('bb source search', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Searches repo-scoped by default (adds repo: prefix)', async () => {
    // Given the workspace has search results
    server.stub('GET', '/workspaces/testws/search/code', searchResults)

    // When I run bb source search TODO
    const result = await bb('source search TODO', { port: server.port })

    // Then the search_query includes repo:testrepo prefix
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/workspaces\/testws\/search\/code/)
    assert.ok(call.query.search_query, 'Should have search_query parameter')
    assert.match(call.query.search_query, /repo:testrepo/)
    assert.match(call.query.search_query, /TODO/)
    assert.equal(result.exitCode, 0)
  })

  it('Searches entire workspace with --all (no repo: prefix)', async () => {
    // Given the workspace has search results
    server.stub('GET', '/workspaces/testws/search/code', searchResults)

    // When I run bb source search TODO --all
    const result = await bb('source search TODO --all', { port: server.port })

    // Then the search_query does NOT include repo: prefix
    const call = server.getLastCall()
    assert.ok(call.query.search_query, 'Should have search_query parameter')
    assert.doesNotMatch(call.query.search_query, /repo:/)
    assert.match(call.query.search_query, /TODO/)
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json', async () => {
    // Given the workspace has search results
    server.stub('GET', '/workspaces/testws/search/code', searchResults)

    // When I run bb source search TODO --json
    const result = await bb('source search TODO --json', { port: server.port })

    // Then stdout is valid JSON array
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.ok(parsed.length > 0)
    assert.equal(result.exitCode, 0)
  })

  it('Fails without a query argument', async () => {
    // Given no search query

    // When I run bb source search without a query
    const result = await bb('source search', { port: server.port })

    // Then it exits with a usage error
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /usage/)
  })

  it('Shows "No results found" for empty response', async () => {
    // Given the workspace returns no search results
    server.stub('GET', '/workspaces/testws/search/code', { values: [], page: 1, size: 0 })

    // When I run bb source search NONEXISTENT
    const result = await bb('source search NONEXISTENT', { port: server.port })

    // Then it reports no results
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /No results found/)
  })
})

describe('output: bb source search', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Formats search results as table', async () => {
    server.stub('GET', '/workspaces/testws/search/code', {
      values: [{
        content_matches: [{ lines: [{ line: 10, segments: [{ text: 'function login() {' }] }] }],
        content_match_count: 3,
        file: {
          path: 'src/auth.ts',
          type: 'commit_file',
          links: { self: { href: 'https://api.bitbucket.org/2.0/repositories/testws/testrepo/src/abc123/src/auth.ts' } }
        }
      }],
      page: 1,
      size: 1
    })

    const result = await bb('source search TODO', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
REPO   FILE   MATCHES   LINES
testrepo  src/auth.ts  3  10
`)
  })

  it('Shows empty message', async () => {
    server.stub('GET', '/workspaces/testws/search/code', { values: [], page: 1, size: 0 })

    const result = await bb('source search NONEXISTENT', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
No results found
`)
  })
})
