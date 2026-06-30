import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import sourceDir from './fixtures/source-dir.json' with { type: 'json' }
import repoInfo from './fixtures/repo-info.json' with { type: 'json' }
import branchRef from './fixtures/branch-ref.json' with { type: 'json' }

describe('bb source ls', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Lists files at root using default branch when no --ref given', async () => {
    // Given the repo has a main branch and files at root
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches/main', branchRef)
    server.stub('GET', '/repositories/testws/testrepo/src/abc123def456789012345678901234567890abcd/', sourceDir)

    // When I run bb source ls (no --ref)
    const result = await bb('source ls', { port: server.port })

    // Then it resolves the default branch and lists files
    const repoCalls = server.getCallsTo('GET', '/repositories/testws/testrepo')
    assert.ok(repoCalls.some(c => c.path === '/repositories/testws/testrepo'), 'Should fetch repo info for default branch')
    const branchCalls = server.getCallsTo('GET', '/refs/branches/main')
    assert.ok(branchCalls.length >= 1, 'Should resolve main branch to hash')
    const srcCalls = server.getCallsTo('GET', '/src/abc123def456789012345678901234567890abcd')
    assert.ok(srcCalls.length >= 1, 'Should fetch source listing with resolved hash')
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /README\.md/)
  })

  it('Lists files with --ref using a hex hash (skips branch resolution)', async () => {
    // Given a hex hash is provided directly
    const hash = 'deadbeef1234567890abcdef1234567890abcdef'
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/`, sourceDir)

    // When I run bb source ls with a hex hash --ref
    const result = await bb(`source ls --ref ${hash}`, { port: server.port })

    // Then it uses the hash directly without resolving
    const calls = server.getCalls()
    const branchCalls = calls.filter(c => c.path.includes('/refs/branches/'))
    assert.equal(branchCalls.length, 0, 'Should NOT resolve branch when hex hash given')
    const srcCalls = server.getCallsTo('GET', `/src/${hash}`)
    assert.ok(srcCalls.length >= 1, 'Should fetch source listing with given hash')
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json', async () => {
    // Given a hex hash and source directory
    const hash = 'deadbeef1234567890abcdef1234567890abcdef'
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/`, sourceDir)

    // When I run bb source ls --ref <hash> --json
    const result = await bb(`source ls --ref ${hash} --json`, { port: server.port })

    // Then stdout is valid JSON
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, 3)
    assert.equal(result.exitCode, 0)
  })

  it('Lists files in a subdirectory path', async () => {
    // Given source files exist at src/
    const hash = 'deadbeef1234567890abcdef1234567890abcdef'
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/src/`, sourceDir)

    // When I run bb source ls src/ --ref <hash>
    const result = await bb(`source ls src/ --ref ${hash}`, { port: server.port })

    // Then it fetches the subdirectory path
    const srcCalls = server.getCallsTo('GET', `/src/${hash}/src/`)
    assert.ok(srcCalls.length >= 1, 'Should fetch the subdirectory listing')
    assert.equal(result.exitCode, 0)
  })
})

describe('output: bb source ls', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Formats file listing as table', async () => {
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches/main', branchRef)
    server.stub('GET', '/repositories/testws/testrepo/src/abc123def456789012345678901234567890abcd/', sourceDir)

    const result = await bb('source ls', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
TYPE   SIZE   PATH
dir   -     src
file  1234  README.md
file  567   package.json
`)
  })

  it('Shows empty message', async () => {
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches/main', branchRef)
    server.stub('GET', '/repositories/testws/testrepo/src/abc123def456789012345678901234567890abcd/', { values: [], page: 1, size: 0 })

    const result = await bb('source ls', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
No files found
`)
  })
})
