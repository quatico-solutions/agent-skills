import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { accountKey, makeStateDir, removeStateDir } from './state.ts'
import user from './fixtures/user.json' with { type: 'json' }

// The account key names the ledger files, so one account must get one key in
// every locale. bb lowercases ASCII only, like Plot's fleetd, which shares the
// ledger (quatico-solutions/agent-skills#135).
const NOW = 1795000000
const EMAIL = 'ÜMLAUT@example.com'
const KEY = 'c402b751590d'

// A UTF-8 locale this machine has; the test is meaningless without one.
function utf8Locale(): string {
  const have = execFileSync('locale', ['-a'], { encoding: 'utf8' }).split('\n').map((l) => l.trim())
  const found = ['en_US.UTF-8', 'en_US.utf8', 'C.UTF-8', 'C.utf8'].find((l) => have.includes(l))
  assert.ok(found, `no UTF-8 locale available (locale -a: ${have.join(', ')})`)
  return found!
}

describe('bb account key', () => {
  let server: MockServer
  let dirs: string[] = []

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => {
    server.reset()
    server.stub('GET', '/user', user)
  })
  afterEach(() => {
    for (const dir of dirs) removeStateDir(dir)
    dirs = []
  })

  it('Lowercases ASCII only in the test helper', () => {
    assert.equal(accountKey(EMAIL), KEY)
    assert.equal(accountKey('Test@Example.com'), accountKey('test@example.com'))
  })

  for (const locale of ['C', 'UTF-8']) {
    it(`Keys a non-ASCII email as ${KEY} under the ${locale} locale`, async () => {
      // Given a state directory and the caller's locale
      const dir = makeStateDir()
      dirs.push(dir)
      const lcAll = locale === 'C' ? 'C' : utf8Locale()

      // When bb sends one request for the account
      const result = await bb('api /user', {
        port: server.port,
        env: { BB_STATE_DIR: dir, BB_NOW: String(NOW), BB_EMAIL: EMAIL, LC_ALL: lcAll },
      })

      // Then the ledger file carries the ASCII-lowercased key
      assert.equal(result.exitCode, 0, result.stderr)
      const ledgers = readdirSync(dir).filter((name) => name.startsWith('requests-'))
      assert.deepEqual(ledgers.map((name) => name.split('-')[1]), [KEY])
    })
  }
})
