import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'

// bb_upper uppercases ASCII only, in every locale. Under a Turkish locale
// GNU tr maps `i` to `i`, so `declined` became `DECLiNED` and
// `--state declined` failed (quatico-solutions/agent-skills#142).
// BSD tr (macOS) uppercases `i` to `I` there, so only the Linux job can fail
// on this test. CI generates the locale; elsewhere a missing one skips.
const LOCALES = ['tr_TR.UTF-8']

function installedLocales(): string[] {
  try {
    return execFileSync('locale', ['-a'], { encoding: 'utf8' }).split('\n').map((l) => l.trim().toLowerCase())
  } catch {
    return []
  }
}

// `locale -a` prints `tr_TR.utf8` on glibc and `tr_TR.UTF-8` on macOS.
function has(installed: string[], locale: string): boolean {
  const lower = locale.toLowerCase()
  return installed.includes(lower) || installed.includes(lower.replace('utf-8', 'utf8'))
}

describe('bb_upper in every locale', () => {
  let server: MockServer
  const installed = installedLocales()

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  for (const locale of LOCALES) {
    const missing = !has(installed, locale)
    if (missing && process.env.CI) {
      it(`Has the ${locale} locale on CI`, () => {
        assert.fail(`${locale} is not installed; bb-tests.yml must generate it`)
      })
      continue
    }

    it(`Sends state=DECLINED for --state declined under ${locale}`, { skip: missing && `${locale} not installed` }, async () => {
      // Given bitbucket has no declined pull requests
      server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })

      // When the caller's locale is Turkish
      const result = await bb('pr list --state declined', { port: server.port, env: { LC_ALL: locale } })

      // Then bb uppercases the i like the C locale does
      assert.equal(result.exitCode, 0, result.stderr)
      assert.equal(server.getLastCall().query.state, 'DECLINED')
    })
  }
})
