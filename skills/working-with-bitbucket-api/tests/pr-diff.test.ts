import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prDiffstat from './fixtures/pr-diffstat.json' with { type: 'json' }

describe('bb pr diff', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Sends GET (raw) to /diff for the raw diff', async () => {
    // Given the API returns a raw diff
    server.stubRaw('GET', '/repositories/testws/testrepo/pullrequests/42/diff', 'diff content')

    // When I run bb pr diff 42
    const result = await bb('pr diff 42', { port: server.port })

    // Then it sends GET to the diff endpoint
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests\/42\/diff$/)
    assert.equal(result.exitCode, 0)
  })

  it('Sends GET to /diffstat with --stat', async () => {
    // Given the API returns diffstat data (paginated)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/diffstat', prDiffstat)

    // When I run bb pr diff 42 --stat
    const result = await bb('pr diff 42 --stat', { port: server.port })

    // Then it sends GET to the diffstat endpoint
    const calls = server.getCallsTo('GET', '/pullrequests/42/diffstat')
    assert.ok(calls.length >= 1, 'Should fetch diffstat')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('raw diff', async () => {
    const rawDiff = [
      'diff --git a/file.ts b/file.ts',
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -1,3 +1,4 @@',
      '+import { foo } from "bar"',
      ' export const x = 1',
    ].join('\n')
    server.stubRaw('GET', '/repositories/testws/testrepo/pullrequests/42/diff', rawDiff)
    const result = await bb('pr diff 42', { port: server.port })
    assert.equal(result.stdout, `\
diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
+import { foo } from "bar"
 export const x = 1`)
  })

  it('diffstat', async () => {
    server.stub('GET', '/repositories/testws/testrepo/pullrequests/42/diffstat', prDiffstat)
    const result = await bb('pr diff 42 --stat', { port: server.port })
    assert.equal(result.stdout, `\
STATUS   ADDED   REMOVED   PATH
modified  +10  -3  src/auth.ts
added     +25  -0  src/login.ts
`)
  })
})
