import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { closedPort } from './closed-port.ts'
import user from './fixtures/user.json' with { type: 'json' }

// A failed bb command prints one stderr line. Two shared causes used to print
// more: missing credentials (three lines) and no HTTP answer (curl's own line
// plus bb's).
const lines = (text: string) => text.split('\n').filter((l) => l !== '')

const scratch = mkdtempSync(path.join(tmpdir(), 'bb-one-line-'))
after(() => rmSync(scratch, { recursive: true, force: true }))

/** A `security` stub that finds no keychain item, first on PATH. */
function noKeychain(): Record<string, string> {
  const bin = mkdtempSync(path.join(scratch, 'bin-'))
  const stub = path.join(bin, 'security')
  writeFileSync(stub, '#!/bin/bash\nexit 1\n')
  chmodSync(stub, 0o755)
  return { PATH: `${bin}:${process.env.PATH ?? ''}`, BB_TOKEN: '' }
}

/** An empty TMPDIR for one run; the test asserts it is empty afterwards. */
function emptyTmp(): { dir: string; env: Record<string, string> } {
  const dir = mkdtempSync(path.join(scratch, 'tmp-'))
  return { dir, env: { TMPDIR: dir } }
}

describe('missing credentials', () => {
  for (const args of ['whoami', 'pr list', 'api /user']) {
    it(`bb ${args} exits 1 with one line naming bb auth login and BB_TOKEN`, async () => {
      // Given no BB_TOKEN and no keychain item
      const port = await closedPort()

      // When I run the command
      const result = await bb(args, { port, env: noKeychain() })

      // Then bb exits 1 with exactly one stderr line
      assert.equal(result.exitCode, 1)
      assert.equal(result.stdout, '')
      const err = lines(result.stderr)
      assert.equal(err.length, 1, result.stderr)
      assert.match(err[0], /^error: no Bitbucket API token found/)
      assert.match(err[0], /bb auth login/)
      assert.match(err[0], /BB_TOKEN/)
    })
  }
})

describe('no response', () => {
  const cases: Array<{ name: string; args: string | string[]; input?: string }> = [
    { name: 'bb whoami', args: 'whoami' },
    { name: 'bb api /user', args: 'api /user' },
    { name: 'bb pr list --all --json', args: 'pr list --all --json' },
    { name: 'bb auth login', args: ['auth', 'login', '--email', 'alice@example.com'], input: 'my-api-token\n' },
  ]
  for (const c of cases) {
    it(`${c.name} exits 1 with one line that carries curl's reason`, async () => {
      // Given nothing listens on the API port
      const port = await closedPort()
      const tmp = emptyTmp()

      // When I run the command
      const result = await bb(c.args, {
        port,
        input: c.input,
        env: { ...tmp.env, PATH: `${path.join(import.meta.dirname, 'fixtures/bin')}:${process.env.PATH ?? ''}` },
      })

      // Then bb exits 1, prints nothing on stdout, and one stderr line with curl's reason
      assert.equal(result.exitCode, 1)
      assert.equal(result.stdout, '')
      const err = lines(result.stderr)
      assert.equal(err.length, 1, result.stderr)
      assert.match(err[0], /^error: no response from Bitbucket \(/)
      assert.match(err[0], /Failed to connect|Couldn't connect/)
      assert.doesNotMatch(err[0], /curl: /)

      // And bb leaves no temp file behind
      assert.deepEqual(readdirSync(tmp.dir), [])
    })
  }
})

describe('HTTP errors keep one line and their exit code', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('HTTP 401 exits 1 with one line', async () => {
    server.stub('GET', '/user', { error: { message: 'bad credentials' } }, 401)
    const tmp = emptyTmp()

    const result = await bb('api /user', { port: server.port, env: tmp.env })

    assert.equal(result.exitCode, 1)
    assert.equal(lines(result.stderr).length, 1, result.stderr)
    assert.deepEqual(readdirSync(tmp.dir), [])
  })

  it('HTTP 429 exits 75 with "rate limited" and no status number', async () => {
    server.stub('GET', '/user', {}, 429)
    const tmp = emptyTmp()

    const result = await bb('api /user', { port: server.port, env: tmp.env })

    assert.equal(result.exitCode, 75)
    assert.match(result.stderr, /rate limited/)
    assert.doesNotMatch(result.stderr, /429/)
    assert.deepEqual(readdirSync(tmp.dir), [])
  })

  it('HTTP 500 exits 1', async () => {
    server.stub('GET', '/user', {}, 500)
    const tmp = emptyTmp()

    const result = await bb('api /user', { port: server.port, env: tmp.env })

    assert.equal(result.exitCode, 1)
    assert.deepEqual(readdirSync(tmp.dir), [])
  })

  it('HTTP 2xx leaves no temp file', async () => {
    server.stub('GET', '/user', user)
    const tmp = emptyTmp()

    const result = await bb('api /user', { port: server.port, env: tmp.env })

    assert.equal(result.exitCode, 0)
    assert.deepEqual(readdirSync(tmp.dir), [])
  })
})
