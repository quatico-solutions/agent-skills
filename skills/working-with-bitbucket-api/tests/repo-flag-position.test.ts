import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }
import prCreateResponse from './fixtures/pr-create-response.json' with { type: 'json' }
import repoInfo from './fixtures/repo-info.json' with { type: 'json' }

// bb reads -R workspace/repo at any position before `--`, not only before the
// subcommand. Agents write the gh form (`bb pr list -R ws/repo`).
describe('bb -R at any position', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  const positions: Array<[string, string[]]> = [
    ['before the subcommand', ['-R', 'otherws/otherrepo', 'pr', 'list']],
    ['between the subcommand words', ['pr', '-R', 'otherws/otherrepo', 'list']],
    ['after the subcommand', ['pr', 'list', '-R', 'otherws/otherrepo']],
    ['after a subcommand flag', ['pr', 'list', '--state', 'open', '-R', 'otherws/otherrepo']],
  ]

  for (const [where, args] of positions) {
    it(`Reads -R ${where}`, async () => {
      // Given the other repository has open pull requests
      server.stub('GET', '/repositories/otherws/otherrepo/pullrequests', prListOpen)

      // When -R stands at this position
      const result = await bb(args, { port: server.port, repo: null })

      // Then bb asks the API for the repository that -R names
      assert.equal(result.stderr, '')
      assert.equal(result.exitCode, 0)
      const call = server.getLastCall()
      assert.equal(call.method, 'GET')
      assert.match(call.path, /^\/repositories\/otherws\/otherrepo\/pullrequests/)
      assert.equal(call.query.state, 'OPEN')
    })
  }

  it('Keeps a boolean flag before -R', async () => {
    // Given the repository accepts a new pull request
    server.stub('GET', '/repositories/otherws/otherrepo', repoInfo)
    server.stub('POST', '/repositories/otherws/otherrepo/pullrequests', prCreateResponse)

    // When --draft is followed by -R
    const result = await bb(
      ['pr', 'create', '--title', 'Test', '--head', 'feature/x', '--draft', '-R', 'otherws/otherrepo'],
      { port: server.port, repo: null },
    )

    // Then the pull request is a draft in the repository that -R names
    assert.equal(result.exitCode, 0, result.stderr)
    const call = server.getCallsTo('POST', '/pullrequests').at(-1)!
    assert.match(call.path, /^\/repositories\/otherws\/otherrepo\/pullrequests/)
    assert.equal((call.body as { draft?: boolean }).draft, true)
  })

  it('Keeps a value that contains -R as one argument', async () => {
    // Given the repository accepts a new pull request
    server.stub('GET', '/repositories/testws/testrepo', repoInfo)
    server.stub('POST', '/repositories/testws/testrepo/pullrequests', prCreateResponse)

    // When a title contains the characters -R and a slash
    const result = await bb(
      ['pr', 'create', '--title', '-R otherws/otherrepo', '--head', 'feature/x'],
      { port: server.port },
    )

    // Then the title is unchanged and the repository is the one given first
    assert.equal(result.exitCode, 0, result.stderr)
    const call = server.getCallsTo('POST', '/pullrequests').at(-1)!
    assert.match(call.path, /^\/repositories\/testws\/testrepo\/pullrequests/)
    assert.equal((call.body as { title?: string }).title, '-R otherws/otherrepo')
  })

  it('Leaves -R after -- to the subcommand', async () => {
    // When -R follows --
    const result = await bb(
      ['-R', 'testws/testrepo', 'pr', 'list', '--', '-R', 'otherws/otherrepo'],
      { port: server.port, repo: null },
    )

    // Then bb does not read it as the repository; the subcommand gets `--`
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown flag: --/)
    assert.doesNotMatch(result.stderr, /given twice/)
    assert.equal(server.getCallsTo('GET', '/repositories/otherws').length, 0)
  })

  it('Accepts the same -R twice', async () => {
    // Given the repository has open pull requests
    server.stub('GET', '/repositories/otherws/otherrepo/pullrequests', prListOpen)

    // When -R names the same repository twice
    const result = await bb(
      ['-R', 'otherws/otherrepo', 'pr', 'list', '-R', 'otherws/otherrepo'],
      { port: server.port, repo: null },
    )

    // Then bb reads it once
    assert.equal(result.exitCode, 0, result.stderr)
    assert.match(server.getLastCall().path, /^\/repositories\/otherws\/otherrepo\/pullrequests/)
  })

  it('Refuses two different -R values', async () => {
    // When -R names two different repositories
    const result = await bb(
      ['-R', 'testws/testrepo', 'pr', 'list', '-R', 'otherws/otherrepo'],
      { port: server.port, repo: null },
    )

    // Then bb exits 1, names both values and makes no request
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /testws\/testrepo/)
    assert.match(result.stderr, /otherws\/otherrepo/)
    assert.equal(server.getCalls().length, 0)
  })

  it('Keeps the format error for -R after the subcommand', async () => {
    // When -R after the subcommand has no slash
    const result = await bb(['pr', 'list', '-R', 'norepo'], { port: server.port, repo: null })

    // Then the error is the same as for -R before the subcommand
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /-R requires workspace\/repo format/)
    assert.equal(server.getCalls().length, 0)
  })
})
