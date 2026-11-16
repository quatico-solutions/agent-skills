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

describe('paging: bb source ls', () => {
  let server: MockServer
  const hash = 'deadbeef1234567890abcdef1234567890abcdef'
  const SRC = `/repositories/testws/testrepo/src/${hash}/docs/`
  const entries = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({
    type: 'commit_file', path: `docs/f${String(from + i).padStart(3, '0')}.md`, size: 10,
  }))

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  // Two pages: 100 entries with a next link, then 3 more
  function servePages() {
    server.stub('GET', SRC, { values: entries(1, 100), next: `${server.baseUrl}${SRC}?pagelen=100&page=2` })
    server.stubWithQuery('GET', SRC, { page: '2' }, { values: entries(101, 3) })
  }

  it('Asks for pagelen=100 and follows next until the list is complete', async () => {
    servePages()

    const result = await bb(`source ls docs/ --ref ${hash} --json`, { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(JSON.parse(result.stdout).length, 103)
    const calls = server.getCallsTo('GET', '/src/')
    assert.equal(calls.length, 2)
    assert.equal(calls[0].query.pagelen, '100')
    assert.doesNotMatch(result.stderr, /truncated/)
  })

  it('Cuts the list at --limit and says so on stderr', async () => {
    servePages()

    const result = await bb(`source ls docs/ --ref ${hash} --limit 10 --json`, { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(JSON.parse(result.stdout).length, 10)
    assert.match(result.stderr, /warning: listing truncated at 10 rows; use a larger --limit/)
    assert.equal(server.getCalls().length, 1)
  })

  it('Stays silent when --limit equals the list length', async () => {
    server.stub('GET', SRC, { values: entries(1, 5) })

    const result = await bb(`source ls docs/ --ref ${hash} --limit 5 --json`, { port: server.port })

    assert.equal(JSON.parse(result.stdout).length, 5)
    assert.doesNotMatch(result.stderr, /truncated/)
  })

  it('Rejects a --limit that is not a positive number', async () => {
    const result = await bb(`source ls --ref ${hash} --limit 0`, { port: server.port })

    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--limit must be a positive number, got '0'/)
  })
})
