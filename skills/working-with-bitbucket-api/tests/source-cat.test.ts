import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import sourceFileMeta from './fixtures/source-file-meta.json' with { type: 'json' }
import branchRef from './fixtures/branch-ref.json' with { type: 'json' }
import repoInfo from './fixtures/repo-info.json' with { type: 'json' }

describe('bb source cat', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Fetches file content with hex hash --ref (skips branch resolution)', async () => {
    // Given a file exists at the given hash
    const hash = 'abc123def4567890abcdef1234567890abcdef12'
    // Stub raw response first (LIFO: will be checked second)
    server.stubRaw('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, '# Test Repository\n\nThis is a test file.')
    // Stub meta response second (LIFO: will be checked first, matches ?format=meta)
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, sourceFileMeta)

    // When I run bb source cat README.md --ref <hash>
    const result = await bb(`source cat README.md --ref ${hash}`, { port: server.port })

    // Then it calls the src endpoint for the file
    const calls = server.getCallsTo('GET', `/src/${hash}/README.md`)
    assert.ok(calls.length >= 1, 'Should fetch file via src endpoint')
    // The first call should be the metadata check (with format=meta)
    const metaCall = calls.find(c => c.query.format === 'meta')
    assert.ok(metaCall, 'Should make a metadata check with ?format=meta')
    assert.equal(result.exitCode, 0)
  })

  it('Does NOT resolve branch when hex hash is provided', async () => {
    // Given a hex hash ref
    const hash = 'abc123def4567890abcdef1234567890abcdef12'
    server.stubRaw('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, 'content')
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, sourceFileMeta)

    // When I run bb source cat with hex hash --ref
    await bb(`source cat README.md --ref ${hash}`, { port: server.port })

    // Then no branch/tag resolution calls are made
    const calls = server.getCalls()
    const branchCalls = calls.filter(c => c.path.includes('/refs/branches/'))
    const tagCalls = calls.filter(c => c.path.includes('/refs/tags/'))
    assert.equal(branchCalls.length, 0, 'Should NOT call branch resolution')
    assert.equal(tagCalls.length, 0, 'Should NOT call tag resolution')
  })

  it('Accepts --raw and prints file content for piping', async () => {
    // Given a file exists at the given hash (meta check is pinned to ?format=meta,
    // so the raw fetch resolves to the raw stub, not the metadata)
    const hash = 'abc123def4567890abcdef1234567890abcdef12'
    server.stubWithQuery('GET', `/repositories/testws/testrepo/src/${hash}/README.md`,
      { format: 'meta' }, sourceFileMeta)
    server.stubRaw('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, 'raw bytes here')

    // When I run bb source cat README.md --ref <hash> --raw
    const result = await bb(`source cat README.md --ref ${hash} --raw`, { port: server.port })

    // Then --raw is accepted and the file content is emitted
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /raw bytes here/)
  })

  it('Errors when path is a directory', async () => {
    // Given the metadata reports a directory type
    const hash = 'abc123def4567890abcdef1234567890abcdef12'
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/src`, {
      path: 'src',
      type: 'commit_directory',
      size: 0
    })

    // When I run bb source cat on a directory path
    const result = await bb(`source cat src --ref ${hash}`, { port: server.port })

    // Then it exits with an error about directories
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /directory/)
  })

  it('Fails without a path argument', async () => {
    // Given no path argument

    // When I run bb source cat without a path
    const result = await bb('source cat', { port: server.port })

    // Then it exits with a usage error
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /usage/)
  })

  it('Resolves branch name via /refs/branches/ before fetching file', async () => {
    // Given a branch name "develop" that resolves to a hash
    const hash = 'def456abc7890123456789012345678901234567'
    server.stub('GET', '/repositories/testws/testrepo/refs/branches/develop', {
      name: 'develop', target: { hash }
    })
    // Stub meta and raw for the resolved hash
    server.stubRaw('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, 'develop content')
    server.stub('GET', `/repositories/testws/testrepo/src/${hash}/README.md`, sourceFileMeta)

    // When I run bb source cat README.md --ref develop
    const result = await bb('source cat README.md --ref develop', { port: server.port })

    // Then it calls /refs/branches/develop to resolve the branch
    const branchCalls = server.getCallsTo('GET', '/refs/branches/develop')
    assert.ok(branchCalls.length >= 1, 'Should call /refs/branches/develop')
    // And src calls use the resolved hash, not "develop"
    const srcCalls = server.getCallsTo('GET', `/src/${hash}/`)
    assert.ok(srcCalls.length >= 1, 'Should use resolved hash in src calls')
    assert.equal(result.exitCode, 0)
  })
})

describe('output: bb source cat', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Prints file content with trailing newline', async () => {
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('GET', '/repositories/testws/testrepo/refs/branches/main', branchRef)
    server.stubWithQuery('GET', '/repositories/testws/testrepo/src/', { format: 'meta' },
      { path: 'README.md', type: 'commit_file', size: 100 })
    server.stubRaw('GET', '/repositories/testws/testrepo/src/', 'Hello, world!\nLine 2')

    const result = await bb('source cat README.md', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
Hello, world!
Line 2
`)
  })

  it('Pretty-prints JSON file with --json', async () => {
    const hash = 'abc123def4567890abcdef1234567890abcdef12'
    server.stubWithQuery('GET', `/repositories/testws/testrepo/src/${hash}/config.json`,
      { format: 'meta' }, sourceFileMeta)
    server.stubRaw('GET', `/repositories/testws/testrepo/src/${hash}/config.json`, '{"key":"value"}')

    const result = await bb(`source cat config.json --ref ${hash} --json`, { port: server.port })

    assert.equal(result.exitCode, 0)
    // --json pretty-prints via jq
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.key, 'value')
    // jq adds indentation
    assert.match(result.stdout, /\n/)
  })
})
