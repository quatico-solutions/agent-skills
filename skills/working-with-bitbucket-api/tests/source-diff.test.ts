import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prDiffstat from './fixtures/pr-diffstat.json' with { type: 'json' }

describe('bb source diff', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Reverses base..head to head..base for the Bitbucket API', async () => {
    // Given a raw diff endpoint (Bitbucket expects {new}..{old})
    server.stubRaw('GET', '/repositories/testws/testrepo/diff/feature/x..main', 'diff --git a/file.ts b/file.ts\n')

    // When I run bb source diff main..feature/x (git-style: base..head)
    const result = await bb('source diff main..feature/x', { port: server.port })

    // Then the API call uses feature/x..main (reversed!)
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/diff\/feature\/x\.\.main/)
    assert.equal(result.exitCode, 0)
  })

  it('Fetches diffstat with --stat and reverses order', async () => {
    // Given a diffstat endpoint
    server.stub('GET', '/repositories/testws/testrepo/diffstat/feature/x..main', prDiffstat)

    // When I run bb source diff main..feature/x --stat
    const result = await bb('source diff main..feature/x --stat', { port: server.port })

    // Then it calls /diffstat/ with reversed ref order
    const calls = server.getCallsTo('GET', '/diffstat/feature/x..main')
    assert.ok(calls.length >= 1, 'Should fetch diffstat with reversed order')
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /src\/auth\.ts/)
  })

  it('Returns raw diff content to stdout', async () => {
    // Given a raw diff endpoint
    const diffContent = 'diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,4 @@\n+import { foo } from "bar"\n'
    server.stubRaw('GET', '/repositories/testws/testrepo/diff/feature/x..main', diffContent)

    // When I run bb source diff main..feature/x
    const result = await bb('source diff main..feature/x', { port: server.port })

    // Then stdout contains the raw diff
    assert.match(result.stdout, /diff --git/)
    assert.match(result.stdout, /import \{ foo \}/)
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --stat --json', async () => {
    // Given a diffstat endpoint
    server.stub('GET', '/repositories/testws/testrepo/diffstat/feature/x..main', prDiffstat)

    // When I run bb source diff main..feature/x --stat --json
    const result = await bb('source diff main..feature/x --stat --json', { port: server.port })

    // Then stdout is valid JSON array
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.equal(result.exitCode, 0)
  })

  it('Fails without a valid base..head spec', async () => {
    // Given no diff spec

    // When I run bb source diff without a spec
    const result = await bb('source diff', { port: server.port })

    // Then it exits with a usage error
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /usage/)
  })

  it('Fails when spec has no .. separator', async () => {
    // Given an invalid spec (no ..)

    // When I run bb source diff with a plain branch name
    const result = await bb('source diff main', { port: server.port })

    // Then it exits with a usage error
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /usage/)
  })

  it('Shows "No changes" for empty diffstat', async () => {
    // Given the diffstat returns no changes
    server.stub('GET', '/repositories/testws/testrepo/diffstat/feature/x..main', { values: [], page: 1, size: 0 })

    // When I run bb source diff main..feature/x --stat
    const result = await bb('source diff main..feature/x --stat', { port: server.port })

    // Then it reports no changes
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /No changes/)
  })
})

describe('output: bb source diff', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Outputs raw diff without trailing newline', async () => {
    server.stubRaw('GET', '/repositories/testws/testrepo/diff/feature/x..main', 'diff --git a/file.ts b/file.ts')

    const result = await bb('source diff main..feature/x', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, 'diff --git a/file.ts b/file.ts')
  })

  it('Formats diffstat as table', async () => {
    server.stub('GET', '/repositories/testws/testrepo/diffstat/feature/x..main', prDiffstat)

    const result = await bb('source diff main..feature/x --stat', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
STATUS   ADDED   REMOVED   PATH
modified  +10  -3  src/auth.ts
added     +25  -0  src/login.ts
`)
  })
})
