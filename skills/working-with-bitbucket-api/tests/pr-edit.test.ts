import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prSingle from './fixtures/pr-single.json' with { type: 'json' }
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }

describe('bb pr edit', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('GETs the current PR then PUTs with new title', async () => {
    // Given the API returns the current PR and accepts the update
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr edit 42 --title Updated
    const result = await bb('pr edit 42 --title Updated', { port: server.port })

    // Then it first GETs the PR, then PUTs with the new title
    const getCalls = server.getCallsTo('GET', '/pullrequests/42')
    assert.ok(getCalls.length >= 1, 'Should GET the current PR')

    const putCalls = server.getCallsTo('PUT', '/pullrequests/42')
    assert.equal(putCalls.length, 1, 'Should send one PUT')
    const body = putCalls[0].body as Record<string, unknown>
    assert.equal(body.title, 'Updated')
    assert.equal(result.exitCode, 0)
  })

  it('PUTs with description when using --body', async () => {
    // Given the API returns the current PR and accepts the update
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr edit 42 --body NewDescription
    const result = await bb('pr edit 42 --body NewDescription', { port: server.port })

    // Then the PUT payload contains the new description
    const putCalls = server.getCallsTo('PUT', '/pullrequests/42')
    assert.equal(putCalls.length, 1, 'Should send one PUT')
    const body = putCalls[0].body as Record<string, unknown>
    assert.equal(body.description, 'NewDescription')
    assert.equal(result.exitCode, 0)
  })

  it('PUTs a new destination branch with --base', async () => {
    // Given the API returns the current PR and accepts the update
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr edit 42 --base develop
    const result = await bb('pr edit 42 --base develop', { port: server.port })

    // Then the PUT payload retargets the destination branch
    const putCalls = server.getCallsTo('PUT', '/pullrequests/42')
    assert.equal(putCalls.length, 1, 'Should send one PUT')
    const body = putCalls[0].body as Record<string, unknown>
    assert.deepEqual((body.destination as any).branch.name, 'develop')
    assert.equal(result.exitCode, 0)
  })

  it('Sets draft:false with --ready', async () => {
    // Given the API returns the current PR and accepts the update
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr edit 42 --ready
    const result = await bb('pr edit 42 --ready', { port: server.port })

    // Then the PUT payload marks the PR ready (draft:false)
    const putCalls = server.getCallsTo('PUT', '/pullrequests/42')
    assert.equal(putCalls.length, 1, 'Should send one PUT')
    const body = putCalls[0].body as Record<string, unknown>
    assert.equal(body.draft, false)
    assert.equal(result.exitCode, 0)
  })

  it('Sets draft:true with --draft', async () => {
    // Given the API returns the current PR and accepts the update
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr edit 42 --draft
    const result = await bb('pr edit 42 --draft', { port: server.port })

    // Then the PUT payload converts the PR back to draft (draft:true)
    const putCalls = server.getCallsTo('PUT', '/pullrequests/42')
    assert.equal(putCalls.length, 1, 'Should send one PUT')
    const body = putCalls[0].body as Record<string, unknown>
    assert.equal(body.draft, true)
    assert.equal(result.exitCode, 0)
  })

  it('Removes reviewer by display name with --remove-reviewer', async () => {
    // Given the PR has Bob Jones as a reviewer
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', { ...prSingle, reviewers: [] })

    // When I run bb pr edit 42 --remove-reviewer "Bob Jones"
    const result = await bb(
      ['pr', 'edit', '42', '--remove-reviewer', 'Bob Jones'],
      { port: server.port }
    )

    // Then the PUT payload should have an empty reviewers array (Bob removed)
    const putCalls = server.getCallsTo('PUT', '/pullrequests/42')
    assert.equal(putCalls.length, 1, 'Should send one PUT')
    const body = putCalls[0].body as Record<string, unknown>
    const reviewers = body.reviewers as Array<Record<string, unknown>>
    assert.ok(Array.isArray(reviewers), 'reviewers should be an array')
    const bobStillPresent = reviewers.some(r => r.account_id === '557058:bbbb0000-1111-2222-3333-444455556666')
    assert.ok(!bobStillPresent, 'Bob should have been removed from reviewers')
    assert.equal(result.exitCode, 0)
  })

  it('Errors when no changes specified', async () => {
    // Given the API returns the current PR
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)

    // When I run bb pr edit 42 with no flags
    const result = await bb('pr edit 42', { port: server.port })

    // Then it exits with an error about nothing to update
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /nothing to update/)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows updated title', async () => {
    // Given the API returns the current PR and accepts the update with new title
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', { ...prSingle, title: 'New title' })

    // When I run bb pr edit 42 --title "New title"
    const result = await bb(
      ['pr', 'edit', '42', '--title', 'New title'],
      { port: server.port }
    )

    // Then it confirms the update with the new title
    assert.equal(result.stdout, `\
Updated PR #42
  Title: New title
`)
  })

  it('Shows updated title and reviewers', async () => {
    // Given the API returns PR data and accepts updates
    // Register generic pullrequests stub FIRST (for reviewer resolution)
    server.stubWithQuery('GET', '/repositories/testws/testrepo/pullrequests', { state: 'MERGED' }, prListOpen)
    // Register specific PR stub SECOND (LIFO: specific wins over generic)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42', prSingle)
    server.stub('PUT', '/repositories/testws/testrepo/pullrequests/42', {
      ...prSingle,
      title: 'Updated',
      reviewers: [{ display_name: 'Bob Jones', nickname: 'bob', account_id: '557058:bbbb0000-1111-2222-3333-444455556666' }]
    })

    // When I run bb pr edit 42 --title Updated --add-reviewer "Bob Jones"
    const result = await bb(
      ['pr', 'edit', '42', '--title', 'Updated', '--add-reviewer', 'Bob Jones'],
      { port: server.port }
    )

    // Then it confirms the update with title and reviewers
    assert.equal(result.stdout, `\
Updated PR #42
  Title: Updated
  Reviewers: Bob Jones
`)
  })
})
