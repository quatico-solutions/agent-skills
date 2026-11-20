import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import branches from './fixtures/branches.json' with { type: 'json' }
import repoInfo from './fixtures/repo-info.json' with { type: 'json' }

describe('bb source branches', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Lists branches via paginated endpoint', async () => {
    // Given the repo has branches (repo-info first so branches stub wins via LIFO)
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', branches)

    // When I run bb source branches
    const result = await bb('source branches', { port: server.port })

    // Then it fetches the branches endpoint
    const calls = server.getCallsTo('GET', '/refs/branches')
    assert.ok(calls.length >= 1, 'Should paginate /refs/branches')
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /main/)
    assert.match(result.stdout, /feature\/login/)
  })

  it('Fetches repo info to detect default branch for display', async () => {
    // Given the repo has branches and a default branch (repo-info first so branches stub wins via LIFO)
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', branches)

    // When I run bb source branches (non-JSON output)
    const result = await bb('source branches', { port: server.port })

    // Then it also calls the repo endpoint for default branch detection
    const repoCalls = server.getCallsTo('GET', '/repositories/testws/testrepo')
    const repoInfoCall = repoCalls.find(c => c.path === '/repositories/testws/testrepo')
    assert.ok(repoInfoCall, 'Should fetch repo info for default branch marker')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json', async () => {
    // Given the repo has branches
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', branches)

    // When I run bb source branches --json
    const result = await bb('source branches --json', { port: server.port })

    // Then stdout is valid JSON array
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].name, 'main')
    assert.equal(result.exitCode, 0)
  })

  it('Exits 75 when the default-branch lookup is rate limited', async () => {
    // Given the branches answer and the repository lookup answers with a rate limit
    server.stub('GET', '/repositories/testws/testrepo', { error: { message: 'slow down' } }, 429)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', branches)

    // When I run bb source branches
    const result = await bb('source branches', { port: server.port })

    // Then bb stops with 75 and prints no table: a list without the default
    // marker would look complete
    assert.equal(result.exitCode, 75, result.stderr)
    assert.equal(result.stdout, '')
    const err = result.stderr.split('\n').filter((l) => l !== '')
    assert.equal(err.length, 1, result.stderr)
    assert.match(err[0], /^error: rate limited — bb paused until /)
  })

  it('Lists branches without a default when that lookup answers 500', async () => {
    // Given the branches answer and the repository lookup fails
    server.stub('GET', '/repositories/testws/testrepo', { error: { message: 'boom' } }, 500)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', branches)

    // When I run bb source branches
    const result = await bb('source branches', { port: server.port })

    // Then the list still prints, with no row marked as the default
    assert.equal(result.exitCode, 0, result.stderr)
    assert.match(result.stdout, /main/)
    assert.match(result.stdout, /feature\/login/)
    assert.doesNotMatch(result.stdout, /^\* /m)
  })

  it('Shows "No branches found" for empty result', async () => {
    // Given the repo has no branches (repo-info first so branches stub wins via LIFO)
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', { values: [], page: 1, size: 0 })

    // When I run bb source branches
    const result = await bb('source branches', { port: server.port })

    // Then it reports no branches
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /No branches found/)
  })
})

describe('output: bb source branches', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Formats branches as table with default branch marker', async () => {
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', branches)

    const result = await bb('source branches', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
NAME   TARGET   MESSAGE
* main           abc123def456  Initial commit
  feature/login  def456abc789  Add login page
`)
  })

  it('Shows empty message', async () => {
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches', { values: [], page: 1, size: 0 })

    const result = await bb('source branches', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
No branches found
`)
  })
})
