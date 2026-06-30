import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prCreateResponse from './fixtures/pr-create-response.json' with { type: 'json' }
import repoInfo from './fixtures/repo-info.json' with { type: 'json' }

describe('bb pr create', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => {
    server.reset()
    // When --base is omitted, bb resolves the repo's default branch via
    // GET /repositories/<ws>/<repo>. Stub it so resolution succeeds.
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
  })

  it('Sends POST with title, source, and destination branches', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I run bb pr create with title, head, and base
    const result = await bb('pr create --title Test --head feature/x --base main', { port: server.port })

    // Then it sends POST with the correct payload
    const call = server.getLastCall()
    assert.equal(call.method, 'POST')
    assert.equal(call.path, '/repositories/testws/testrepo/pullrequests')
    const body = call.body as Record<string, unknown>
    assert.equal(body.title, 'Test')
    assert.deepEqual((body.source as any).branch.name, 'feature/x')
    assert.deepEqual((body.destination as any).branch.name, 'main')
    assert.equal(result.exitCode, 0)
  })

  it('Resolves the default base branch via the API when --base is omitted', async () => {
    // Given the repo's default branch is "main" (from repo-info stub)
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I create a PR without --base
    const result = await bb('pr create --title Test --head feature/x', { port: server.port })

    // Then it first GETs the repo to resolve the default branch
    const repoGet = server.getCallsTo('GET', '/repositories/testws/testrepo')
    assert.ok(repoGet.length >= 1, 'should GET the repo to resolve default branch')
    // And the POST destination uses the resolved branch
    const post = server.getCallsTo('POST', '/pullrequests')[0]
    const body = post.body as Record<string, unknown>
    assert.deepEqual((body.destination as any).branch.name, 'main')
    assert.equal(result.exitCode, 0)
  })

  it('Includes draft:true with --draft', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I run bb pr create with --draft
    const result = await bb('pr create --title Test --head feature/x --draft', { port: server.port })

    // Then the payload includes draft: true
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    assert.equal(body.draft, true)
    assert.equal(result.exitCode, 0)
  })

  it('Includes close_source_branch:true with --close-branch', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I run bb pr create with --close-branch
    const result = await bb('pr create --title Test --head feature/x --close-branch', { port: server.port })

    // Then the payload includes close_source_branch: true
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    assert.equal(body.close_source_branch, true)
    assert.equal(result.exitCode, 0)
  })

  it('Includes description with --body', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I run bb pr create with --body
    const result = await bb('pr create --title Test --head feature/x --body Description', { port: server.port })

    // Then the payload includes description
    const call = server.getLastCall()
    const body = call.body as Record<string, unknown>
    assert.equal(body.description, 'Description')
    assert.equal(result.exitCode, 0)
  })

  it('Errors when a reviewer display name cannot be resolved', async () => {
    // Given no PRs exist to resolve reviewer display names from
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)
    server.stubWithQuery('GET', '/repositories/testws/testrepo/pullrequests', { state: 'MERGED' }, { values: [] })
    server.stubWithQuery('GET', '/repositories/testws/testrepo/pullrequests', { state: 'OPEN' }, { values: [] })

    // When I add an unresolvable reviewer by display name
    const result = await bb(
      ['pr', 'create', '--title', 'Test', '--head', 'feature/x', '--reviewer', 'Ghost Person'],
      { port: server.port }
    )

    // Then it errors and does not create the PR
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /cannot resolve reviewer 'Ghost Person'/)
    assert.equal(server.getCallsTo('POST', '/pullrequests').length, 0)
  })

  it('Sends reviewers array with UUID --reviewer', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I run bb pr create with a UUID reviewer (bypasses display name resolution)
    const result = await bb(
      'pr create --title Test --head feature/x --reviewer {bbbb0000-1111-2222-3333-444455556666}',
      { port: server.port }
    )

    // Then the payload includes a reviewers array with the UUID
    const postCalls = server.getCallsTo('POST', '/pullrequests')
    assert.ok(postCalls.length >= 1, 'Should send POST to create PR')
    const createCall = postCalls.find(c => c.path === '/repositories/testws/testrepo/pullrequests')
    assert.ok(createCall, 'Should find the create PR call')
    const body = createCall.body as Record<string, unknown>
    const reviewers = body.reviewers as Array<Record<string, string>>
    assert.ok(Array.isArray(reviewers), 'reviewers should be an array')
    assert.equal(reviewers.length, 1)
    assert.equal(reviewers[0].uuid, '{bbbb0000-1111-2222-3333-444455556666}')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => {
    server.reset()
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
  })

  it('Shows created PR link', async () => {
    // Given the API accepts PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When I run bb pr create
    const result = await bb(
      ['pr', 'create', '--title', 'New PR', '--head', 'feature/new'],
      { port: server.port }
    )

    // Then it shows the created PR number and URL
    assert.equal(result.stdout, `\
Created PR #99: https://bitbucket.org/testws/testrepo/pull-requests/99
`)
  })

  it('Shows created draft PR link', async () => {
    // Given the API accepts draft PR creation
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', { ...prCreateResponse, draft: true })

    // When I run bb pr create --draft
    const result = await bb(
      ['pr', 'create', '--title', 'New PR', '--head', 'feature/new', '--draft'],
      { port: server.port }
    )

    // Then it shows the created draft PR number and URL
    assert.equal(result.stdout, `\
Created draft PR #99: https://bitbucket.org/testws/testrepo/pull-requests/99
`)
  })
})
