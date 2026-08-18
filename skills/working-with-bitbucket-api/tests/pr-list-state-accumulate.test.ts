import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }

const PRS = '/repositories/testws/testrepo/pullrequests'

/**
 * Every `state` value the request carried, however it was expressed.
 *
 * Express collapses a repeated query parameter to an array, so `call.query.state`
 * is a string for one state and a string[] for several. The author path expresses
 * states inside a `q=` filter instead, so they are read out of the raw URL there.
 * Both are the same question — which states did this query cover? — and the tests
 * below ask it without caring which construction answered.
 */
function statesInCall(call: { query: Record<string, unknown>; url: string }): string[] {
  const q = call.query.state
  if (Array.isArray(q)) return [...q].sort()
  if (typeof q === 'string') return [q]
  // Author path: states live in the q= expression, e.g. state = "OPEN" OR state = "MERGED"
  const decoded = decodeURIComponent(call.url)
  return [...decoded.matchAll(/state\s*=\s*"([A-Z]+)"/g)].map((m) => m[1]).sort()
}

describe('bb pr list repeated --state', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Covers both states when --state is given twice', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', PRS, prListOpen)

    // When I ask for open and merged
    const result = await bb('pr list --state open --state merged', { port: server.port })

    // Then the query covers both, rather than silently keeping the last
    assert.equal(result.exitCode, 0)
    assert.deepEqual(statesInCall(server.getLastCall()), ['MERGED', 'OPEN'])
  })

  it('Gives the same answer whichever order the states are written in', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', PRS, prListOpen)

    // When I write the two states in the opposite order
    await bb('pr list --state merged --state open', { port: server.port })
    const reversed = statesInCall(server.getLastCall())
    server.reset()
    server.stub('GET', PRS, prListOpen)
    await bb('pr list --state open --state merged', { port: server.port })
    const forward = statesInCall(server.getLastCall())

    // Then order does not decide the answer. The original finding: the same two
    // flags returned 50 merged PRs one way and 3 open ones the other.
    assert.deepEqual(reversed, forward)
  })

  it('Covers every state when all four are given', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', PRS, prListOpen)

    // When I ask for all four states
    const result = await bb(
      'pr list --state open --state merged --state declined --state superseded',
      { port: server.port },
    )

    // Then none of them is dropped
    assert.equal(result.exitCode, 0)
    assert.deepEqual(statesInCall(server.getLastCall()), ['DECLINED', 'MERGED', 'OPEN', 'SUPERSEDED'])
  })

  it('Treats a repeated identical state as harmless', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', PRS, prListOpen)

    // When I pass the same state twice
    const result = await bb('pr list --state open --state open', { port: server.port })

    // Then it behaves as a single --state open: no error, no duplicate filter
    assert.equal(result.exitCode, 0)
    assert.deepEqual(statesInCall(server.getLastCall()), ['OPEN'])
  })

  it('Keeps both states when --author is also given', async () => {
    // Given bitbucket has PRs by alice
    server.stub('GET', PRS, prListOpen)

    // When I combine an author filter with two states
    const result = await bb('pr list --author alice --state open --state merged', { port: server.port })

    // Then neither state is dropped.
    //
    // This is the assertion that matters most. With --author, bb builds a q=
    // filter expression instead of state= parameters, and Bitbucket lets q=
    // silently override state=. An implementation that only appends state=
    // parameters passes every other test in this file and still discards both
    // states here — this plan's own bug, reintroduced by its fix.
    assert.equal(result.exitCode, 0)
    const call = server.getLastCall()
    assert.deepEqual(statesInCall(call), ['MERGED', 'OPEN'])
    assert.match(decodeURIComponent(call.url), /author\.nickname/)
  })

  it('Covers all requested states on the client-side author fallback', async () => {
    // Given the server-side nickname filter finds nothing, forcing the fallback
    server.stub('GET', PRS, [])

    // When I ask for two states with an author
    const result = await bb('pr list --author alice --state open --state merged', { port: server.port })

    // Then the fallback re-fetch covers both states too. A recovery path that
    // silently narrows the result fails exactly the way the bug does.
    assert.equal(result.exitCode, 0)
    const calls = server.getCallsTo('GET', '/pullrequests')
    assert.ok(calls.length >= 2, `expected a fallback re-fetch, saw ${calls.length} call(s)`)
    assert.deepEqual(statesInCall(calls[calls.length - 1]), ['MERGED', 'OPEN'])
  })

  it('Accumulates repeated --author the same way', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', PRS, prListOpen)

    // When I pass --author twice
    const result = await bb('pr list --author alice --author bob', { port: server.port })

    // Then both authors reach the query — one rule for repeated flags, not two
    // flags with two behaviours
    assert.equal(result.exitCode, 0)
    const url = decodeURIComponent(server.getLastCall().url)
    assert.match(url, /alice/)
    assert.match(url, /bob/)
  })

  it('Keeps a multi-word author intact while accumulating', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', PRS, prListOpen)

    // When the author is a display name containing a space
    const result = await bb(['pr', 'list', '--author', 'Alice Smith', '--state', 'open', '--state', 'merged'], { port: server.port })

    // Then the name survives as one author, not two. Accumulating into a
    // space-delimited string would split it into "Alice" and "Smith" — neither
    // of which exists — and every single-word author in this file would still pass.
    assert.equal(result.exitCode, 0)
    const url = decodeURIComponent(server.getLastCall().url)
    assert.match(url, /author\.nickname = "Alice Smith"/)
    assert.deepEqual(statesInCall(server.getLastCall()), ['MERGED', 'OPEN'])
  })

  it('Still rejects an invalid state', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', PRS, prListOpen)

    // When I misspell a state
    const result = await bb('pr list --state open --state bogus', { port: server.port })

    // Then it fails loudly. This check is load-bearing: the API does not reject
    // an unrecognised state, it silently drops the filter and returns everything
    // — measured at 1678 rows where the default returns 5.
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /invalid --state 'BOGUS'/)
  })

  it('Leaves a single --state unchanged', async () => {
    // Given bitbucket has merged pull requests
    server.stub('GET', PRS, prListOpen)

    // When I pass one state, as callers do today
    const result = await bb('pr list --state merged', { port: server.port })

    // Then the query is exactly what it was before this change
    assert.equal(result.exitCode, 0)
    assert.equal(server.getLastCall().query.state, 'MERGED')
  })

  it('Defaults to OPEN when no --state is given', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', PRS, prListOpen)

    // When I pass no state at all
    const result = await bb('pr list', { port: server.port })

    // Then the default is untouched
    assert.equal(result.exitCode, 0)
    assert.equal(server.getLastCall().query.state, 'OPEN')
  })
})
