import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// install-dependencies.sh verifies the binary it just installed: only a `bb --version`
// line that names quatico-bb passes. brew is stubbed; the script runs for real.
const SCRIPT = new URL('../install-dependencies.sh', import.meta.url).pathname
const INSTALL = 'brew install quatico-solutions/tap/quatico-bb'
const QUATICO_LINE = `bb 1.12.1 (quatico-bb — ${INSTALL})`

describe('install-dependencies.sh self-check', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'bb-install-'))
    mkdirSync(join(root, 'prefix', 'bin'), { recursive: true })
    mkdirSync(join(root, 'cellar'))
    mkdirSync(join(root, 'tools'))
    mkdirSync(join(root, 'home'))
    const brew = [
      '#!/bin/bash',
      'case "$1" in',
      `  --prefix) echo "${root}/prefix" ;;`,
      `  --cellar) echo "${root}/cellar" ;;`,
      'esac',
      '',
    ].join('\n')
    writeFileSync(join(root, 'tools', 'brew'), brew, { mode: 0o755 })
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  // The installed bb is a symlink, as Homebrew leaves it.
  const installBb = (versionLine?: string) => {
    if (versionLine === undefined) return
    const real = join(root, 'tools', 'bb-real')
    writeFileSync(real, `#!/bin/bash\n[ "$1" = --version ] && echo '${versionLine}'\nexit 0\n`)
    chmodSync(real, 0o755)
    symlinkSync(real, join(root, 'prefix', 'bin', 'bb'))
  }

  const run = () => spawnSync('/bin/bash', [SCRIPT], {
    encoding: 'utf8',
    env: { PATH: `${root}/tools:/usr/bin:/bin`, HOME: join(root, 'home') },
  })

  it('Fails with the install command when the installed bb prints only a version', () => {
    installBb('bb 0.9.0')

    const result = run()

    assert.equal(result.status, 1)
    assert.match(result.stdout, /is not quatico-bb/)
    assert.ok(result.stdout.includes(INSTALL))
    assert.doesNotMatch(result.stdout, /All dependencies installed/)
  })

  it('Passes when the installed bb prints the quatico-bb line', () => {
    installBb(QUATICO_LINE)

    const result = run()

    assert.equal(result.status, 0)
    assert.ok(result.stdout.includes(QUATICO_LINE))
    assert.match(result.stdout, /All dependencies installed/)
  })

  it('Reports a missing bb as not installed, not as the wrong package', () => {
    installBb()

    const result = run()

    assert.equal(result.status, 1)
    assert.match(result.stdout, /is missing after a successful brew step/)
    assert.doesNotMatch(result.stdout, /is not quatico-bb/)
  })
})
