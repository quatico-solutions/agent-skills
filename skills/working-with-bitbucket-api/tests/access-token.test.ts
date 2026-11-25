import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import { execFile, execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { accountKey, makeStateDir, readPause, readRequests, removeStateDir, seedPause } from './state.ts'
import user from './fixtures/user.json' with { type: 'json' }
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }

// BB_ACCESS_TOKEN holds a workspace, project or repository access token. bb
// sends it as "Authorization: Bearer <token>", it wins over the email pair, and
// its requests and pause are kept under the key: the first 12 hex characters of
// the SHA-256 of "access-token:" followed by the token, not case-folded.
const NOW = 1795000000
const TOKEN = 'ATCTT3xFfGN0-Access-Token_Value'
const EMAIL = 'test@example.com'
const SLOW = { error: { message: 'slow down' } }

/** The documented ledger key of an access token. */
const tokenKey = (token: string): string =>
  createHash('sha256').update(`access-token:${token}`).digest('hex').slice(0, 12)

/** The epochs recorded under a ledger key, in every request file, in ascending order. */
const requestsUnder = (dir: string, key: string): number[] => {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.startsWith(`requests-${key}-`) && name.endsWith('.log'))
    .flatMap((name) => readFileSync(path.join(dir, name), 'utf8').split('\n'))
    .filter((line) => /^[0-9]+$/.test(line))
    .map(Number)
    .sort((a, b) => a - b)
}

/** Makes the state directory, which bb otherwise makes on first use, and returns it. */
const mkdirFor = (dir: string): string => {
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('bb with an access token', () => {
  let server: MockServer
  let dirs: string[] = []
  let bin: string
  let tmp: string
  let imgPath: string

  before(async () => {
    server = await createMockServer()
    // A keychain that holds nothing: no test may read the real one.
    bin = mkdtempSync(path.join(tmpdir(), 'bb-access-token-bin-'))
    writeFileSync(path.join(bin, 'security'), '#!/bin/bash\nexit 1\n')
    chmodSync(path.join(bin, 'security'), 0o755)
    tmp = mkdtempSync(path.join(tmpdir(), 'bb-access-token-'))
    imgPath = path.join(tmp, 'shot.png')
    writeFileSync(imgPath, 'PNGDATA')
  })
  after(async () => {
    await server.stop()
    rmSync(bin, { recursive: true, force: true })
    rmSync(tmp, { recursive: true, force: true })
  })
  beforeEach(() => server.reset())
  afterEach(() => {
    for (const dir of dirs) removeStateDir(dir)
    dirs = []
  })

  function stateDir(): string {
    const dir = makeStateDir()
    dirs.push(dir)
    return dir
  }

  /** Only the access token: no email pair in the environment or the keychain. */
  function tokenOnly(dir: string, extra: Record<string, string> = {}): Record<string, string> {
    return {
      BB_STATE_DIR: dir,
      BB_NOW: String(NOW),
      BB_ACCESS_TOKEN: TOKEN,
      BB_EMAIL: '',
      BB_TOKEN: '',
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      ...extra,
    }
  }

  /** The access token and the email pair of run-bb.ts, both set. */
  function both(dir: string, extra: Record<string, string> = {}): Record<string, string> {
    return { BB_STATE_DIR: dir, BB_NOW: String(NOW), BB_ACCESS_TOKEN: TOKEN, ...extra }
  }

  function assertBearerOnly(call: { headers: Record<string, string> }): void {
    assert.equal(call.headers.authorization, `Bearer ${TOKEN}`)
    assert.doesNotMatch(String(call.headers.authorization), /^Basic /)
  }

  describe('request sites', () => {
    it('Sends Bearer and no Basic from bb api (bb_api_call)', async () => {
      server.stub('GET', '/user', user)
      const result = await bb('api /user', { port: server.port, env: tokenOnly(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assertBearerOnly(server.getLastCall())
    })

    it('Sends Bearer and no Basic from bb pr list (bb_paginate)', async () => {
      server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)
      const result = await bb('pr list', { port: server.port, env: tokenOnly(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assert.ok(server.getCalls().length > 0)
      for (const call of server.getCalls()) assertBearerOnly(call)
    })

    it('Sends Bearer and no Basic from bb pr diff (bb_api_raw)', async () => {
      server.stubRaw('GET', '/repositories/testws/testrepo/pullrequests/42/diff', 'diff content')
      const result = await bb('pr diff 42', { port: server.port, env: tokenOnly(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assertBearerOnly(server.getLastCall())
    })

    it('Sends Bearer and no Basic from bb download upload (bb_download_upload)', async () => {
      server.stub('POST', '/repositories/testws/testrepo/downloads', {}, 201)
      const result = await bb(['download', 'upload', imgPath], { port: server.port, env: tokenOnly(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assertBearerOnly(server.getLastCall())
    })

    it('Sends Bearer and not the email pair when both are set', async () => {
      server.stub('GET', '/user', user)
      const result = await bb('api /user', { port: server.port, env: both(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assertBearerOnly(server.getLastCall())
    })

    it('Treats an empty BB_ACCESS_TOKEN as unset and sends the email pair', async () => {
      server.stub('GET', '/user', user)
      const result = await bb('api /user', { port: server.port, env: { BB_ACCESS_TOKEN: '' } })
      assert.equal(result.exitCode, 0, result.stderr)
      const expected = `Basic ${Buffer.from(`${EMAIL}:fake-test-token`).toString('base64')}`
      assert.equal(server.getLastCall().headers.authorization, expected)
    })

    it('Validates the given email pair in bb auth login, and says the access token wins', async () => {
      server.stub('GET', '/user', user)
      const shim = fileURLToPath(new URL('./fixtures/bin', import.meta.url))
      const result = await bb(['auth', 'login', '--email', 'alice@example.com'], {
        port: server.port,
        input: 'my-api-token\n',
        env: { ...both(stateDir()), PATH: `${shim}:${process.env.PATH ?? ''}` },
      })
      assert.equal(result.exitCode, 0, result.stderr)
      const expected = `Basic ${Buffer.from('alice@example.com:my-api-token').toString('base64')}`
      assert.equal(server.getLastCall().headers.authorization, expected)
      assert.equal(result.stderr, 'note: BB_ACCESS_TOKEN is set, so bb sends it and not the stored email pair\n')
    })
  })

  describe('HTTP 401', () => {
    it('Names BB_ACCESS_TOKEN on one line and sends one request, with no fallback to the email pair', async () => {
      server.stub('GET', '/user', { error: { message: 'Token is invalid' } }, 401)
      const result = await bb('api /user', { port: server.port, env: both(stateDir()) })
      assert.equal(result.exitCode, 1)
      assert.equal(result.stderr, 'error: HTTP 401 — Token is invalid (Bitbucket refused BB_ACCESS_TOKEN; bb does not fall back to BB_EMAIL/BB_TOKEN)\n')
      assert.equal(server.getCalls().length, 1)
      assertBearerOnly(server.getLastCall())
      assert.ok(!result.stderr.includes(TOKEN))
    })
  })

  describe('ledger', () => {
    it('Records a token request under the documented key, which holds no part of the token', async () => {
      server.stub('GET', '/user', user)
      const dir = stateDir()
      const result = await bb('api /user', { port: server.port, env: both(dir) })
      assert.equal(result.exitCode, 0, result.stderr)

      const key = tokenKey(TOKEN)
      assert.deepEqual(requestsUnder(dir, key), [NOW])
      // And not under the email key, although the email pair is set
      assert.deepEqual(readRequests(dir, EMAIL), [])
      for (const name of readdirSync(dir)) {
        for (let i = 0; i + 4 <= TOKEN.length; i++) {
          assert.ok(!name.includes(TOKEN.slice(i, i + 4)), `${name} holds part of the token`)
        }
      }
    })

    it('Gives a token whose case differs its own key', () => {
      assert.notEqual(tokenKey(TOKEN), tokenKey(TOKEN.toLowerCase()))
      assert.notEqual(tokenKey(EMAIL), accountKey(EMAIL))
    })

    it('Keeps the case of the token in the key', async () => {
      server.stub('GET', '/user', user)
      const dir = stateDir()
      const lower = TOKEN.toLowerCase()
      await bb('api /user', { port: server.port, env: tokenOnly(dir, { BB_ACCESS_TOKEN: lower }) })
      assert.deepEqual(requestsUnder(dir, tokenKey(lower)), [NOW])
      assert.deepEqual(requestsUnder(dir, tokenKey(TOKEN)), [])
    })

    it('Pauses the token key after a 429 and leaves the email key unpaused', async () => {
      server.stub('GET', '/user', SLOW, 429)
      const dir = stateDir()
      const result = await bb('api /user', { port: server.port, env: both(dir) })
      assert.equal(result.exitCode, 75, result.stderr)
      assert.ok(existsSync(path.join(dir, `pause-${tokenKey(TOKEN)}`)))
      assert.equal(readPause(dir, EMAIL), null)

      // And the email pair still sends
      server.reset()
      server.stub('GET', '/user', user)
      const email = await bb('api /user', { port: server.port, env: { BB_STATE_DIR: dir, BB_NOW: String(NOW) } })
      assert.equal(email.exitCode, 0, email.stderr)
    })

    it('Pauses the email key after a 429 and leaves the token key unpaused', async () => {
      server.stub('GET', '/user', SLOW, 429)
      const dir = stateDir()
      const result = await bb('api /user', { port: server.port, env: { BB_STATE_DIR: dir, BB_NOW: String(NOW) } })
      assert.equal(result.exitCode, 75, result.stderr)
      assert.notEqual(readPause(dir, EMAIL), null)
      assert.ok(!existsSync(path.join(dir, `pause-${tokenKey(TOKEN)}`)))

      // And the token still sends
      server.reset()
      server.stub('GET', '/user', user)
      const token = await bb('api /user', { port: server.port, env: both(dir) })
      assert.equal(token.exitCode, 0, token.stderr)
    })

    it('Refuses a token request while the token key is paused', async () => {
      server.stub('GET', '/user', user)
      const dir = stateDir()
      writeFileSync(path.join(mkdirFor(dir), `pause-${tokenKey(TOKEN)}`), `${NOW + 300} 300\n`)
      const result = await bb('api /user', { port: server.port, env: tokenOnly(dir) })
      assert.equal(result.exitCode, 75)
      assert.equal(server.getCalls().length, 0)
    })

    it('Sends on the token while the email key is paused', async () => {
      server.stub('GET', '/user', user)
      const dir = stateDir()
      seedPause(dir, EMAIL, NOW + 300, 300)
      const result = await bb('api /user', { port: server.port, env: both(dir) })
      assert.equal(result.exitCode, 0, result.stderr)
    })

    it('Accepts a BB_HOURLY_LIMIT above 800 for the token key', async () => {
      server.stub('GET', '/user', user)
      const dir = stateDir()
      const key = tokenKey(TOKEN)
      const stamp = new Date(NOW * 1000).toISOString().slice(0, 13).replace(/[-T]/g, '')
      writeFileSync(path.join(mkdirFor(dir), `requests-${key}-${stamp}.log`), `${Array(900).fill(NOW - 10).join('\n')}\n`)

      const refused = await bb('api /user', { port: server.port, env: tokenOnly(dir) })
      assert.equal(refused.exitCode, 75)
      const sent = await bb('api /user', { port: server.port, env: tokenOnly(dir, { BB_HOURLY_LIMIT: '1000' }) })
      assert.equal(sent.exitCode, 0, sent.stderr)
    })
  })

  describe('the token outside the request', () => {
    /** A curl on PATH that records each argument on its own line, then runs the real curl. */
    const curlShim = (log: string): string => {
      const realCurl = execFileSync('/bin/sh', ['-c', 'command -v curl'], { encoding: 'utf8' }).trim()
      const shimDir = mkdtempSync(path.join(tmp, 'curl-shim-'))
      writeFileSync(path.join(shimDir, 'curl'), `#!/bin/bash\nprintf '%s\\n' "$@" >>'${log}'\nexec '${realCurl}' "$@"\n`)
      chmodSync(path.join(shimDir, 'curl'), 0o755)
      return shimDir
    }

    it('Passes no curl argument that holds the token, and leaves no file behind', async () => {
      server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)
      const log = path.join(tmp, 'curl-args.log')
      const shimDir = curlShim(log)
      const ownTmp = mkdtempSync(path.join(tmp, 'tmpdir-'))
      const env = tokenOnly(stateDir(), { PATH: `${shimDir}:${bin}:${process.env.PATH ?? ''}`, TMPDIR: ownTmp })
      const result = await bb('pr list', { port: server.port, env })
      assert.equal(result.exitCode, 0, result.stderr)
      for (const call of server.getCalls()) assertBearerOnly(call)
      const args = readFileSync(log, 'utf8')
      assert.match(args, /^-H\n@/m)
      assert.ok(!args.includes(TOKEN.slice(0, 8)), args)
      assert.deepEqual(readdirSync(ownTmp), [])
    })

    it('Writes no part of the token to bash -x output', async () => {
      server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)
      const bbPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../cli/bb')
      const env = {
        HOME: process.env.HOME ?? '',
        BB_API_URL: `http://localhost:${server.port}/mockbb`,
        ...tokenOnly(stateDir()),
      }
      const stderr = await new Promise<string>((resolve) => {
        const child = execFile('bash', ['-x', bbPath, '-R', 'testws/testrepo', 'pr', 'list'], { env, timeout: 10_000, maxBuffer: 16 * 1024 * 1024 },
          (error, _stdout, err) => resolve(`${error ? `exit ${String(error.code)}\n` : ''}${err}`))
        child.stdin?.end('')
      })
      assert.ok(server.getCalls().length > 0, stderr.slice(-2000))
      for (const call of server.getCalls()) assertBearerOnly(call)
      assert.ok(!stderr.includes(TOKEN.slice(0, 8)), 'bash -x printed the token')
      assert.ok(stderr.includes(tokenKey(TOKEN)), 'the trace should name the ledger key instead')
    })
  })

  describe('bb auth status', () => {
    it('Exits 0 with only an access token and names it', async () => {
      server.stub('GET', '/user', user)
      const result = await bb('auth status', { port: server.port, env: tokenOnly(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assert.equal(result.stdout, `\
nickname: testuser
display_name: Test User
account_id: 557058:abcdef01-2345-6789-abcd-ef0123456789
credentials: BB_ACCESS_TOKEN env
`)
      assert.ok(!(result.stdout + result.stderr).includes(TOKEN))
    })

    it('States that the email pair was set and ignored', async () => {
      server.stub('GET', '/user', user)
      const result = await bb('auth status', { port: server.port, env: both(stateDir()) })
      assert.equal(result.exitCode, 0, result.stderr)
      assert.match(result.stdout, /^credentials: BB_ACCESS_TOKEN env\nignored: email pair from BB_EMAIL\/BB_TOKEN env\n$/m)
    })

    it('Names the credential and the ignored pair in JSON, and never the token', async () => {
      server.stub('GET', '/user', user)
      const only = await bb('auth status --json', { port: server.port, env: tokenOnly(stateDir()) })
      const pair = await bb('auth status --json', { port: server.port, env: both(stateDir()) })
      assert.equal(JSON.parse(only.stdout).credentials, 'BB_ACCESS_TOKEN env')
      assert.equal(JSON.parse(only.stdout).ignored, null)
      assert.equal(JSON.parse(pair.stdout).ignored, 'BB_EMAIL/BB_TOKEN env')
      for (const r of [only, pair]) assert.ok(!(r.stdout + r.stderr).includes(TOKEN))
    })
  })

  describe('bb rate-limit', () => {
    it('Counts the token key and names the access token, with no email pair', async () => {
      const dir = stateDir()
      const key = tokenKey(TOKEN)
      const stamp = new Date(NOW * 1000).toISOString().slice(0, 13).replace(/[-T]/g, '')
      writeFileSync(path.join(mkdirFor(dir), `requests-${key}-${stamp}.log`), `${NOW - 10}\n${NOW - 5}\n`)

      const text = await bb('rate-limit', { port: server.port, env: tokenOnly(dir) })
      assert.equal(text.exitCode, 0, text.stderr)
      assert.equal(text.stdout, 'requests in the last hour: 2 of 800 (this machine)\ncredential: access token (BB_ACCESS_TOKEN)\n')

      const json = await bb('rate-limit --json', { port: server.port, env: tokenOnly(dir) })
      assert.deepEqual(JSON.parse(json.stdout), {
        requests: 2, ceiling: 800, paused_until: null, wait_seconds: 0, credential: 'access-token',
      })
      assert.ok(!(json.stdout + json.stderr + text.stdout + text.stderr).includes(TOKEN))
      assert.equal(server.getCalls().length, 0)
    })

    it('Reads the token key, not the email key, when both are set', async () => {
      const dir = stateDir()
      seedPause(dir, EMAIL, NOW + 300, 300)
      const result = await bb('rate-limit --json', { port: server.port, env: both(dir) })
      assert.equal(result.exitCode, 0, result.stderr)
      assert.equal(JSON.parse(result.stdout).paused_until, null)
    })
  })
})

