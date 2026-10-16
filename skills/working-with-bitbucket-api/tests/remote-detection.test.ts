import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }

// Without -R, bb infers workspace/repo from `git remote get-url origin`.
describe('bb repository detection from the origin remote', () => {
  let server: MockServer
  const dirs: string[] = []

  before(async () => { server = await createMockServer() })
  after(() => {
    server.stop()
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  })
  beforeEach(() => server.reset())

  function repoWithOrigin(url: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'bb-remote-'))
    dirs.push(dir)
    execFileSync('git', ['init', '-q', dir])
    execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', url])
    return dir
  }

  const forms = [
    'git@bitbucket.org:myws/myrepo.git',
    'git@bitbucket.org:myws/myrepo',
    'git@ssh.bitbucket.org:myws/myrepo.git',
    'git@ssh.bitbucket.org:myws/myrepo',
    'ssh://git@bitbucket.org/myws/myrepo.git',
    'ssh://git@bitbucket.org/myws/myrepo',
    'ssh://git@ssh.bitbucket.org/myws/myrepo.git',
    'ssh://git@ssh.bitbucket.org/myws/myrepo',
    'ssh://git@altssh.bitbucket.org:443/myws/myrepo.git',
    'ssh://git@altssh.bitbucket.org:443/myws/myrepo',
    'https://bitbucket.org/myws/myrepo.git',
    'https://bitbucket.org/myws/myrepo',
    'https://someuser@bitbucket.org/myws/myrepo.git',
    'https://someuser@bitbucket.org/myws/myrepo',
  ]

  for (const url of forms) {
    it(`Detects myws/myrepo from ${url}`, async () => {
      // Given a git repository whose origin is the URL
      const cwd = repoWithOrigin(url)
      server.stub('GET', '/repositories/myws/myrepo/pullrequests', prListOpen)

      // When I run bb pr list without -R
      const result = await bb('pr list', { port: server.port, repo: null, cwd })

      // Then it requests the pull requests of myws/myrepo
      assert.equal(result.exitCode, 0, result.stderr)
      assert.equal(server.getLastCall().path, '/repositories/myws/myrepo/pullrequests')
    })
  }

  it('Rejects an origin on another host', async () => {
    // Given a git repository whose origin is on github.com
    const cwd = repoWithOrigin('git@github.com:myws/myrepo.git')

    // When I run bb pr list without -R
    const result = await bb('pr list', { port: server.port, repo: null, cwd })

    // Then it errors and makes no request
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /origin remote is not a bitbucket\.org URL/)
    assert.equal(server.getCalls().length, 0)
  })
})
