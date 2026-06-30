import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import commits from './fixtures/commits.json' with { type: 'json' }
import commitSingle from './fixtures/commit-single.json' with { type: 'json' }
import repoInfo from './fixtures/repo-info.json' with { type: 'json' }

describe('bb source commits', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Lists commits on a named branch', async () => {
    // Given the branch has commits
    server.stub('GET', '/repositories/testws/testrepo/commits/main', commits)

    // When I run bb source commits main
    const result = await bb('source commits main', { port: server.port })

    // Then it fetches commits for that branch with pagelen=30
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/commits\/main/)
    assert.equal(call.query.pagelen, '30')
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /Add login feature/)
  })

  it('Shows single commit detail when given a hex SHA', async () => {
    // Given a commit exists
    const sha = 'abc123def456789012345678901234567890abcd'
    server.stub('GET', `/repositories/testws/testrepo/commit/${sha}`, commitSingle)

    // When I run bb source commits <sha>
    const result = await bb(`source commits ${sha}`, { port: server.port })

    // Then it fetches a single commit via /commit/ (not /commits/)
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/commit\/abc123def456/)
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /Add login feature/)
  })

  it('Uses /commit/ endpoint for hex SHA, not /commits/', async () => {
    // Given a hex SHA
    const sha = 'abc123def456789012345678901234567890abcd'
    server.stub('GET', `/repositories/testws/testrepo/commit/${sha}`, commitSingle)

    // When I run bb source commits <sha>
    await bb(`source commits ${sha}`, { port: server.port })

    // Then the API path uses /commit/ (singular)
    const call = server.getLastCall()
    assert.match(call.path, /\/commit\//)
    assert.doesNotMatch(call.path, /\/commits\//)
  })

  it('Defaults to current ref when no argument given', async () => {
    // Given the repo has a default branch
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/commits/main', commits)

    // When I run bb source commits (no argument)
    const result = await bb('source commits', { port: server.port })

    // Then it resolves the default branch and lists its commits
    const repoCalls = server.getCallsTo('GET', '/repositories/testws/testrepo')
    assert.ok(repoCalls.some(c => c.path === '/repositories/testws/testrepo'), 'Should fetch repo info for default ref')
    const commitCalls = server.getCallsTo('GET', '/commits/main')
    assert.ok(commitCalls.length >= 1, 'Should fetch commits for main branch')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json for commit list', async () => {
    // Given the branch has commits
    server.stub('GET', '/repositories/testws/testrepo/commits/main', commits)

    // When I run bb source commits main --json
    const result = await bb('source commits main --json', { port: server.port })

    // Then stdout is valid JSON
    const parsed = JSON.parse(result.stdout)
    assert.ok(parsed.values, 'JSON output should contain values')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json for single commit', async () => {
    // Given a commit exists
    const sha = 'abc123def456789012345678901234567890abcd'
    server.stub('GET', `/repositories/testws/testrepo/commit/${sha}`, commitSingle)

    // When I run bb source commits <sha> --json
    const result = await bb(`source commits ${sha} --json`, { port: server.port })

    // Then stdout is valid JSON of a single commit
    const parsed = JSON.parse(result.stdout)
    assert.ok(parsed.hash, 'JSON output should be a single commit object')
    assert.equal(result.exitCode, 0)
  })
})

describe('output: bb source commits', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Formats branch commits as table', async () => {
    server.stub('GET', '/repositories/testws/testrepo/commits/main', commits)

    const result = await bb('source commits main', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
HASH   DATE   AUTHOR   MESSAGE
abc123def456  2025-01-15  Alice Smith  Add login feature
def456abc789  2025-01-01  Alice Smith  Initial commit
`)
  })

  it('Formats single commit detail', async () => {
    const sha = 'abc123def456789012345678901234567890abcd'
    server.stub('GET', `/repositories/testws/testrepo/commit/${sha}`, commitSingle)

    const result = await bb(`source commits ${sha}`, { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
Commit:   abc123def456
Author:   Alice Smith <alice@example.com>
Date:     2025-01-15T10:00:00+00:00
Parents:  def456abc789

Add login feature

Implements OAuth login flow
`)
  })
})
