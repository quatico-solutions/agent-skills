import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import tags from './fixtures/tags.json' with { type: 'json' }

describe('bb source tags', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Lists tags via paginated endpoint', async () => {
    // Given the repo has tags
    server.stub('GET', '/repositories/testws/testrepo/refs/tags', tags)

    // When I run bb source tags
    const result = await bb('source tags', { port: server.port })

    // Then it fetches the tags endpoint
    const calls = server.getCallsTo('GET', '/refs/tags')
    assert.ok(calls.length >= 1, 'Should paginate /refs/tags')
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /v1\.0\.0/)
  })

  it('Outputs JSON with --json', async () => {
    // Given the repo has tags
    server.stub('GET', '/repositories/testws/testrepo/refs/tags', tags)

    // When I run bb source tags --json
    const result = await bb('source tags --json', { port: server.port })

    // Then stdout is valid JSON array
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].name, 'v1.0.0')
    assert.equal(result.exitCode, 0)
  })

  it('Shows "No tags found" for empty result', async () => {
    // Given the repo has no tags
    server.stub('GET', '/repositories/testws/testrepo/refs/tags', { values: [], page: 1, size: 0 })

    // When I run bb source tags
    const result = await bb('source tags', { port: server.port })

    // Then it reports no tags
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /No tags found/)
  })

  it('Displays tag name, target hash, date, and message', async () => {
    // Given the repo has a tag
    server.stub('GET', '/repositories/testws/testrepo/refs/tags', tags)

    // When I run bb source tags
    const result = await bb('source tags', { port: server.port })

    // Then output includes tag details
    assert.match(result.stdout, /v1\.0\.0/)
    assert.match(result.stdout, /abc123def456/)
    assert.match(result.stdout, /Release 1\.0\.0/)
    assert.equal(result.exitCode, 0)
  })
})

describe('output: bb source tags', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Formats tags as table', async () => {
    server.stub('GET', '/repositories/testws/testrepo/refs/tags', tags)

    const result = await bb('source tags', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
NAME   TARGET   DATE   MESSAGE
v1.0.0  abc123def456  2025-01-01  Release 1.0.0
`)
  })

  it('Shows empty message', async () => {
    server.stub('GET', '/repositories/testws/testrepo/refs/tags', { values: [], page: 1, size: 0 })

    const result = await bb('source tags', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, `\
No tags found
`)
  })
})

describe('paging: bb source tags', () => {
  let server: MockServer
  const TAGS = '/repositories/testws/testrepo/refs/tags'
  const tag = (n: number) => ({
    name: `v${n}`, target: { hash: `abc${n}`, date: '2025-01-01T10:00:00+00:00', message: `Release ${n}` },
  })
  const tags = (from: number, n: number) => Array.from({ length: n }, (_, i) => tag(from + i))

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  function servePages() {
    server.stub('GET', TAGS, { values: tags(1, 100), next: `${server.baseUrl}${TAGS}?pagelen=100&page=2` })
    server.stubWithQuery('GET', TAGS, { page: '2' }, { values: tags(101, 7) })
  }

  it('Asks for pagelen=100 and follows next until the list is complete', async () => {
    servePages()

    const result = await bb('source tags --json', { port: server.port })

    assert.equal(result.exitCode, 0)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.length, 107)
    assert.equal(parsed[0].name, 'v1', 'Keeps the API order')
    assert.equal(parsed[106].name, 'v107')
    const calls = server.getCallsTo('GET', '/refs/tags')
    assert.equal(calls.length, 2)
    assert.equal(calls[0].query.pagelen, '100')
    assert.doesNotMatch(result.stderr, /truncated/)
  })

  it('Cuts the list at --limit and says so on stderr', async () => {
    servePages()

    const result = await bb('source tags --limit 3', { port: server.port })

    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /v3\b/)
    assert.doesNotMatch(result.stdout, /v4\b/)
    assert.match(result.stderr, /warning: listing truncated at 3 rows; use a larger --limit/)
  })

  it('Rejects a --limit that is not a positive number', async () => {
    const result = await bb('source tags --limit abc', { port: server.port })

    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--limit must be a positive number, got 'abc'/)
  })
})
