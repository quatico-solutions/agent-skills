import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'

// Bitbucket Cloud deprecated its code search endpoint (CHANGE-3167) and answers
// HTTP 410. The subcommand fails at once, with no request.
describe('bb source search (deprecated)', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Fails with exit 1 and names the deprecation and the alternatives, without a request', async () => {
    // Given any query
    // When I run bb source search TODO
    const result = await bb('source search TODO', { port: server.port })

    // Then it exits 1 with one message, and sends no request
    assert.equal(result.exitCode, 1)
    assert.equal(server.getCalls().length, 0, 'Should not call the API')
    assert.match(result.stderr, /^error: .*deprecated/)
    assert.match(result.stderr, /CHANGE-3167/)
    assert.match(result.stderr, /git grep/)
    assert.match(result.stderr, /source ls/)
    assert.match(result.stderr, /source cat/)
    assert.equal(result.stderr.trim().split('\n').length, 1, 'One message line')
  })

  it('Fails the same way without a query and with the old flags', async () => {
    const bare = await bb('source search', { port: server.port })
    const flags = await bb('source search TODO --all --json', { port: server.port })

    assert.equal(bare.exitCode, 1)
    assert.equal(flags.exitCode, 1)
    assert.match(bare.stderr, /deprecated/)
    assert.match(flags.stderr, /deprecated/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Is gone from the top-level help', async () => {
    const top = await bb('--help', { port: server.port })

    assert.doesNotMatch(top.stdout, /source search/)
    assert.doesNotMatch(top.stdout, /Search code/)
  })
})
