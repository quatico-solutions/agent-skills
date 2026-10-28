import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import { closedPort } from './closed-port.ts'
import prListOpen from './fixtures/pr-list-open.json' with { type: 'json' }
import prListMerged from './fixtures/pr-list-merged.json' with { type: 'json' }
import prListFive from './fixtures/pr-list-five.json' with { type: 'json' }

describe('bb pr list', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Lists open PRs by default', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then it sends GET with state=OPEN
    const call = server.getLastCall()
    assert.equal(call.method, 'GET')
    assert.match(call.path, /\/repositories\/testws\/testrepo\/pullrequests/)
    assert.equal(call.query.state, 'OPEN')
    assert.equal(result.exitCode, 0)
  })

  it('Filters by --state merged', async () => {
    // Given bitbucket has merged pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListMerged)

    // When I run bb pr list --state merged
    const result = await bb('pr list --state merged', { port: server.port })

    // Then it sends state=MERGED
    const call = server.getLastCall()
    assert.equal(call.query.state, 'MERGED')
    assert.equal(result.exitCode, 0)
  })

  it('Filters by --author with server-side nickname query', async () => {
    // Given bitbucket has PRs by alice
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list --author alice
    const result = await bb('pr list --author alice', { port: server.port })

    // Then the query contains author.nickname filter
    const call = server.getLastCall()
    assert.match(call.url, /author\.nickname/)
    assert.match(call.url, /alice/)
    assert.equal(result.exitCode, 0)
  })

  it('Outputs JSON with --json', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list --json
    const result = await bb('pr list --json', { port: server.port })

    // Then stdout is valid JSON
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed))
    assert.equal(result.exitCode, 0)
  })

  it('Falls back to client-side display_name filter when nickname returns empty', async () => {
    // Given the nickname-filtered query returns nothing (generic stub catches ?q=... calls)
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })
    // The fallback call uses ?state=OPEN (query-matched stub wins over generic)
    server.stubWithQuery('GET', '/repositories/testws/testrepo/pullrequests',
      { state: 'OPEN' }, prListOpen)

    // When I run bb pr list --author "Alice Smith"
    const result = await bb(
      ['pr', 'list', '--author', 'Alice Smith'],
      { port: server.port }
    )

    // Then it makes two GET calls (first nickname filter, then fallback)
    const prCalls = server.getCallsTo('GET', '/pullrequests')
    assert.ok(prCalls.length >= 2, `Should make at least 2 calls to /pullrequests, got ${prCalls.length}`)
    // And it succeeds (found results via fallback display_name match)
    assert.equal(result.exitCode, 0)
    // Output should contain Alice Smith's PR
    assert.match(result.stdout, /Alice Smith/)
  })

  it('Uppercases --state value', async () => {
    // Given bitbucket has declined pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })

    // When I run bb pr list --state declined (lowercase)
    const result = await bb('pr list --state declined', { port: server.port })

    // Then it sends state=DECLINED (uppercase)
    const call = server.getLastCall()
    assert.equal(call.query.state, 'DECLINED')
    assert.equal(result.exitCode, 0)
  })
})

describe('output', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Shows tabular PR list', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then it shows a header row and one row per PR
    assert.equal(result.stdout, `\
ID   STATE   AUTHOR   BRANCH   TITLE
42  OPEN  Alice Smith  feature/login    Add login feature
43  OPEN  Bob Jones    fix/readme-typo  Fix typo in README
`)
  })

  it('Shows DRAFT state for draft PRs', async () => {
    // Given a PR list where one PR is a draft
    const draftList = {
      values: [
        {
          id: 50, title: 'WIP: new feature', state: 'OPEN', draft: true,
          author: { display_name: 'Alice Smith', nickname: 'alice' },
          source: { branch: { name: 'feature/wip' } },
          destination: { branch: { name: 'main' } },
          reviewers: []
        }
      ],
      page: 1, size: 1
    }
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', draftList)

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then the output shows DRAFT instead of OPEN
    assert.match(result.stdout, /DRAFT/)
    assert.ok(!result.stdout.includes('OPEN'), 'Should show DRAFT, not OPEN')
  })

  it('Shows empty state message', async () => {
    // Given bitbucket has no matching pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', { values: [], page: 1, size: 0 })

    // When I run bb pr list
    const result = await bb('pr list', { port: server.port })

    // Then it shows the empty state message
    assert.equal(result.stdout, `\
No pull requests match the query
`)
  })
})

describe('bb pr list --json <fields> / --jq', () => {
  let server: MockServer
  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Projects a single gh-style field', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request only headRefName
    const result = await bb('pr list --json headRefName', { port: server.port })

    // Then each element is an object with exactly that key, mapped from the BB path
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [
      { headRefName: 'feature/login' },
      { headRefName: 'fix/readme-typo' },
    ])
  })

  it('Projects multiple fields with mapped values', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request number,headRefName,isDraft
    const result = await bb('pr list --json number,headRefName,isDraft', { port: server.port })

    // Then each element has exactly those keys
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [
      { number: 42, headRefName: 'feature/login', isDraft: false },
      { number: 43, headRefName: 'fix/readme-typo', isDraft: false },
    ])
  })

  it('Mirrors gh author shape ({login})', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request author
    const result = await bb('pr list --json author', { port: server.port })

    // Then author is an object with a login key (from .author.nickname)
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [
      { author: { login: 'alice' } },
      { author: { login: 'bob' } },
    ])
  })

  it('Passes JSON through --jq (acceptance: one branch per line)', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run the forge-portable acceptance command
    const result = await bb(
      ['pr', 'list', '--state', 'open', '--json', 'headRefName', '--jq', '.[].headRefName'],
      { port: server.port }
    )

    // Then stdout is one raw branch name per line
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, 'feature/login\nfix/readme-typo\n')
  })

  it('Rejects an unknown field', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I request a field that does not exist
    const result = await bb('pr list --json bogus', { port: server.port })

    // Then it exits 1 and names the supported fields on stderr
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /unknown field 'bogus'/)
    assert.match(result.stderr, /headRefName/)
  })

  it('Rejects --jq without --json', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I use --jq without --json
    const result = await bb(['pr', 'list', '--jq', '.'], { port: server.port })

    // Then it exits 1 with a clear message
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--jq requires --json/)
  })

  it('Bare --json still emits full objects (regression)', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I run bare --json
    const result = await bb('pr list --json', { port: server.port })

    // Then the full Bitbucket objects are returned unchanged (nested paths intact)
    const parsed = JSON.parse(result.stdout)
    assert.equal(result.exitCode, 0)
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].source.branch.name, 'feature/login')
    assert.equal(parsed[0].id, 42)
  })

  it('Keeps Bitbucket state casing (documented gh divergence)', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I project the state field
    const result = await bb('pr list --json state', { port: server.port })

    // Then values stay Bitbucket's uppercase (not gh's lowercase)
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [{ state: 'OPEN' }, { state: 'OPEN' }])
  })

  it('Projects null when a mapped path is absent', async () => {
    // Given a PR with no author object
    const noAuthor = {
      values: [{
        id: 99, title: 'Orphan', state: 'OPEN', draft: false,
        source: { branch: { name: 'feature/orphan' } },
        destination: { branch: { name: 'main' } }, reviewers: []
      }],
      page: 1, size: 1
    }
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', noAuthor)

    // When I project author (nickname absent)
    const result = await bb('pr list --json author', { port: server.port })

    // Then it does not crash; login is null
    assert.equal(result.exitCode, 0)
    assert.deepEqual(JSON.parse(result.stdout), [{ author: { login: null } }])
  })

  it('Rejects a field list mixing valid and unknown fields', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When one of several fields is unknown
    const result = await bb('pr list --json number,bogus', { port: server.port })

    // Then it fails on the unknown one
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /unknown field 'bogus'/)
  })

  it('Rejects an empty field name (trailing/double comma)', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When the field list has a trailing comma
    const trailing = await bb('pr list --json number,', { port: server.port })
    // And when it has a double comma
    const doubled = await bb('pr list --json number,,title', { port: server.port })

    // Then both fail with a clear empty-field message
    assert.equal(trailing.exitCode, 1)
    assert.match(trailing.stderr, /empty field name/)
    assert.equal(doubled.exitCode, 1)
    assert.match(doubled.stderr, /empty field name/)
  })

  it('Applies --jq to full objects when no field list is given', async () => {
    // Given bitbucket has open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

    // When I --jq over the full (unprojected) objects
    const result = await bb(
      ['pr', 'list', '--json', '--jq', '.[].source.branch.name'],
      { port: server.port }
    )

    // Then jq reads the raw Bitbucket paths
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, 'feature/login\nfix/readme-typo\n')
  })
})

describe('bb pr list --limit', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it('Caps the result at --limit, matching gh pr list -L/--limit', async () => {
    // Given bitbucket has 5 open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListFive)

    // When I ask for at most 2
    const result = await bb('pr list --limit 2 --json', { port: server.port })

    // Then only 2 come back, not all 5
    assert.equal(result.exitCode, 0)
    assert.equal(JSON.parse(result.stdout).length, 2)
  })

  it('Returns everything below the limit unchanged', async () => {
    // Given bitbucket has 5 open pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListFive)

    // When the limit is above the actual count
    const result = await bb('pr list --limit 10 --json', { port: server.port })

    // Then all 5 are returned
    assert.equal(result.exitCode, 0)
    assert.equal(JSON.parse(result.stdout).length, 5)
  })

  it('Rejects a non-numeric --limit', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListFive)

    // When --limit is not a number
    const result = await bb('pr list --limit abc', { port: server.port })

    // Then it fails loudly, same style as the --line validation on pr comment
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--limit must be a positive number, got 'abc'/)
  })

  it('Rejects a zero --limit', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListFive)

    // When --limit is 0 (gh: "invalid value for --limit: 0")
    const result = await bb('pr list --limit 0', { port: server.port })

    // Then it fails loudly instead of silently returning nothing
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--limit must be a positive number, got '0'/)
  })

  it('Rejects a negative --limit', async () => {
    // Given bitbucket has pull requests
    server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListFive)

    // When --limit is negative
    const result = await bb('pr list --limit -1', { port: server.port })

    // Then it fails loudly
    assert.equal(result.exitCode, 1)
    assert.match(result.stderr, /--limit must be a positive number, got '-1'/)
  })

  it('Documents --limit in --help', async () => {
    // When I ask for help
    const result = await bb('pr list --help', { port: server.port })

    // Then --limit is documented, gh-style
    assert.equal(result.exitCode, 0)
    assert.match(result.stdout, /--limit <n>/)
  })

  describe('paging', () => {
    const PR_PATH = '/repositories/testws/testrepo/pullrequests'

    // Serves `pages` pages of `size` PRs each. Page 1 answers the request
    // without a page= parameter; later pages answer on page=N, as Bitbucket's
    // next links do. The last page carries no next link.
    function servePages(pages: number, size: number) {
      const pageBody = (n: number) => ({
        values: Array.from({ length: size }, (_, i) => ({
          id: (n - 1) * size + i + 1,
          title: `PR ${(n - 1) * size + i + 1}`,
          state: 'MERGED',
          author: { display_name: 'A', nickname: 'a' },
          source: { branch: { name: 'src' } },
          destination: { branch: { name: 'main' } },
        })),
        ...(n < pages ? { next: `${server.baseUrl}${PR_PATH}?state=MERGED&pagelen=${size}&page=${n + 1}` } : {}),
      })
      server.stub('GET', PR_PATH, pageBody(1))
      for (let n = 2; n <= pages; n++) {
        server.stubWithQuery('GET', PR_PATH, { page: String(n) }, pageBody(n))
      }
    }

    const noSleep = { BB_RETRY_BASE_MS: '0' }

    it('Follows next links until --limit rows are held', async () => {
      // Given 4 pages of 50 PRs
      servePages(4, 50)

      // When I ask for 120 merged PRs
      const result = await bb('pr list --state merged --limit 120 --json number --jq length', { port: server.port })

      // Then 120 rows print, from exactly 3 requests, without a warning
      assert.equal(result.exitCode, 0)
      assert.equal(result.stdout.trim(), '120')
      assert.equal(server.getCalls().length, 3)
      assert.doesNotMatch(result.stderr, /truncated/)
    })

    it('Reads every page with --all', async () => {
      // Given 4 pages of 50 PRs
      servePages(4, 50)

      // When I ask for all merged PRs
      const result = await bb('pr list --state merged --all --json number --jq length', { port: server.port })

      // Then all 200 rows print, from 4 requests, without a warning
      assert.equal(result.exitCode, 0)
      assert.equal(result.stdout.trim(), '200')
      assert.equal(server.getCalls().length, 4)
      assert.equal(result.stderr, '')
    })

    it('Reads more than 10 pages with --all', async () => {
      // Given 12 pages
      servePages(12, 5)

      // When I ask for all merged PRs
      const result = await bb('pr list --state merged --all --json number --jq length', { port: server.port })

      // Then no page cap applies
      assert.equal(result.stdout.trim(), '60')
      assert.equal(server.getCalls().length, 12)
    })

    it('Accumulates listings larger than one argv string', async () => {
      // Given 4 pages of 50 PRs with 1000-character titles (about 200 KB in total)
      const pad = 'x'.repeat(1000)
      const page = (n: number) => ({
        values: Array.from({ length: 50 }, (_, i) => ({ id: n * 50 + i, title: pad, state: 'MERGED', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } })),
        ...(n < 3 ? { next: `${server.baseUrl}${PR_PATH}?state=MERGED&pagelen=50&page=${n + 2}` } : {}),
      })
      server.stub('GET', PR_PATH, page(0))
      for (let n = 1; n <= 3; n++) server.stubWithQuery('GET', PR_PATH, { page: String(n + 1) }, page(n))

      // When I read them all
      const result = await bb('pr list --state merged --all --json number --jq length', { port: server.port })

      // Then no row is lost to an argument-size limit
      assert.equal(result.exitCode, 0)
      assert.equal(result.stdout.trim(), '200')
    })

    it('Rejects --all together with --limit', async () => {
      const result = await bb('pr list --all --limit 5', { port: server.port })
      assert.equal(result.exitCode, 1)
      assert.match(result.stderr, /--all and --limit cannot be combined/)
    })

    it('Warns on stderr when the default limit leaves a next link', async () => {
      // Given 3 pages of 50 PRs
      servePages(3, 50)

      // When I list without --limit
      const result = await bb('pr list --state merged --json number --jq length', { port: server.port })

      // Then 50 rows print from one request, and stderr carries the warning
      assert.equal(result.stdout.trim(), '50')
      assert.equal(server.getCalls().length, 1)
      assert.match(result.stderr, /warning: listing truncated at 50 rows; use --limit or --all/)
    })

    it('Stays silent when the default limit ends exactly on the last page', async () => {
      // Given one page of 50 PRs and no next link
      servePages(1, 50)

      // When I list without --limit
      const result = await bb('pr list --state merged --json number --jq length', { port: server.port })

      // Then there is nothing left to warn about
      assert.equal(result.stdout.trim(), '50')
      assert.equal(result.stderr, '')
    })

    it('Stays silent when --limit stops the listing early', async () => {
      // Given 3 pages of 50 PRs
      servePages(3, 50)

      // When the caller chooses a limit that leaves pages unread
      const result = await bb('pr list --state merged --limit 10 --json number --jq length', { port: server.port })

      // Then the choice is the caller's: no warning
      assert.equal(result.stdout.trim(), '10')
      assert.equal(result.stderr, '')
    })

    it('Sends pagelen=50 on pr list but not on other paged listings', async () => {
      // Given a PR list and a comments listing
      servePages(1, 5)
      server.stub('GET', `${PR_PATH}/7/comments`, { values: [] })
      server.stub('GET', `${PR_PATH}/7`, { id: 7, title: 't', state: 'OPEN', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } })

      // When I run both
      await bb('pr list --state merged', { port: server.port })
      await bb('pr view 7 --comments', { port: server.port })

      // Then only the pr list request carries pagelen
      const list = server.getCalls().find(c => c.path === PR_PATH)
      assert.equal(list?.query.pagelen, '50')
      const comments = server.getCallsTo('GET', '/comments')
      assert.ok(comments.length > 0)
      assert.equal(comments[0].query.pagelen, undefined)
    })

    it('Puts --updated-since into the q= expression', async () => {
      // Given a PR list
      servePages(1, 2)

      // When I filter by update time
      const result = await bb('pr list --state merged --updated-since 2026-10-01', { port: server.port })

      // Then the query is the q= form, inclusive, with no state= parameter
      assert.equal(result.exitCode, 0)
      const q = server.getLastCall().query
      assert.equal(q.q, '(state = "MERGED") AND updated_on >= "2026-10-01"')
      assert.equal(q.state, undefined)
    })

    it('Combines --updated-since with --author in one q= expression', async () => {
      servePages(1, 2)

      const result = await bb('pr list --state merged --author alice --updated-since 2026-10-01', { port: server.port })

      assert.equal(result.exitCode, 0)
      assert.equal(
        server.getCalls()[0].query.q,
        '(state = "MERGED") AND (author.nickname = "alice") AND updated_on >= "2026-10-01"',
      )
    })

    it('Rejects a malformed --updated-since', async () => {
      const result = await bb('pr list --updated-since yesterday', { port: server.port })
      assert.equal(result.exitCode, 1)
      assert.match(result.stderr, /--updated-since must be an ISO date or time/)
    })

    it('Retries a page that answers 429 once, then succeeds', async () => {
      // Given page 1 answers 429 with Retry-After, then 200
      const ok = { values: [{ id: 1, title: 't', state: 'MERGED', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } }] }
      server.stubSequence('GET', PR_PATH, {}, [
        { status: 429, body: { error: { message: 'slow down' } }, headers: { 'Retry-After': '0' } },
        { status: 200, body: ok },
      ])

      // When I list
      const result = await bb('pr list --state merged --json number --jq length', { port: server.port, env: noSleep })

      // Then the list succeeds after 2 requests and names the 0 s wait
      assert.equal(result.exitCode, 0)
      assert.equal(result.stdout.trim(), '1')
      assert.equal(server.getCalls().length, 2)
      assert.match(result.stderr, /retrying in 0 s \(1\/5\)/)
    })

    it('Retries a 429 without Retry-After', async () => {
      const ok = { values: [{ id: 1, title: 't', state: 'MERGED', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } }] }
      server.stubSequence('GET', PR_PATH, {}, [
        { status: 429, body: { error: { message: 'slow down' } } },
        { status: 200, body: ok },
      ])

      const result = await bb('pr list --state merged --json number --jq length', { port: server.port, env: noSleep })

      assert.equal(result.exitCode, 0)
      assert.equal(server.getCalls().length, 2)
    })

    it('Logs the backoff schedule 2, 4, 8, 16, 32 s without Retry-After', async () => {
      // Given page 1 answers 429 five times, then 200
      const ok = { values: [{ id: 1, title: 't', state: 'MERGED', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } }] }
      const slow = { status: 429, body: { error: { message: 'slow down' } } }
      server.stubSequence('GET', PR_PATH, {}, [slow, slow, slow, slow, slow, { status: 200, body: ok }])

      // When I list
      const result = await bb('pr list --state merged --json number --jq length', { port: server.port, env: noSleep })

      // Then the fifth retry succeeds and each wait is named on stderr, in order
      assert.equal(result.exitCode, 0)
      assert.equal(result.stdout.trim(), '1')
      assert.equal(server.getCalls().length, 6)
      const waits = [...result.stderr.matchAll(/retrying in (\d+) s \((\d)\/5\)/g)].map(m => `${m[1]}:${m[2]}`)
      assert.deepEqual(waits, ['2:1', '4:2', '8:3', '16:4', '32:5'])
    })

    it('Caps a Retry-After above 60 s at 60 s', async () => {
      const ok = { values: [{ id: 1, title: 't', state: 'MERGED', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } }] }
      server.stubSequence('GET', PR_PATH, {}, [
        { status: 429, body: { error: { message: 'slow down' } }, headers: { 'Retry-After': '120' } },
        { status: 200, body: ok },
      ])

      const result = await bb('pr list --state merged --json number --jq length', { port: server.port, env: noSleep })

      assert.equal(result.exitCode, 0)
      assert.match(result.stderr, /retrying in 60 s \(1\/5\)/)
    })

    it('Fails after 5 retries and prints no rows', async () => {
      // Given page 1 reads fine and page 2 answers 429 every time
      const first = {
        values: [{ id: 1, title: 't', state: 'MERGED', author: { display_name: 'A' }, source: { branch: { name: 's' } }, destination: { branch: { name: 'main' } } }],
        next: `${server.baseUrl}${PR_PATH}?state=MERGED&pagelen=1&page=2`,
      }
      server.stub('GET', PR_PATH, first)
      server.stubSequence('GET', PR_PATH, { page: '2' }, [
        { status: 429, body: { error: { message: 'slow down' } } },
      ])

      // When I read all pages
      const result = await bb('pr list --state merged --all --json', { port: server.port, env: noSleep })

      // Then it exits 75 after 1 + 6 requests, names the rows read, and prints nothing
      assert.equal(result.exitCode, 75)
      assert.equal(result.stdout, '')
      assert.match(result.stderr, /error: rate limited after 1 rows/)
      assert.equal(server.getCalls().length, 7)
    })

    it('Names the raw Retry-After of the final 429, not the 60 s cap', async () => {
      const limited = { status: 429, body: { error: { message: 'slow down' } }, headers: { 'Retry-After': '3600' } }
      server.stubSequence('GET', PR_PATH, {}, [limited, limited, limited, limited, limited, limited])

      const result = await bb('pr list --state merged --json', { port: server.port, env: noSleep })

      assert.equal(result.exitCode, 75)
      assert.equal(result.stdout, '')
      assert.match(result.stderr, /error: rate limited after 0 rows — Bitbucket asked to wait 3600 s/)
      assert.doesNotMatch(result.stderr, /429/)
    })

    it('Prints no wait suffix when the final 429 has no Retry-After', async () => {
      const limited = { status: 429, body: { error: { message: 'slow down' } } }
      server.stubSequence('GET', PR_PATH, {}, [limited, limited, limited, limited, limited, limited])

      const result = await bb('pr list --state merged --json', { port: server.port, env: noSleep })

      assert.equal(result.exitCode, 75)
      assert.match(result.stderr, /error: rate limited after 0 rows\s*$/)
    })

    it('Fails other non-2xx answers on the first attempt', async () => {
      server.stub('GET', PR_PATH, { error: { message: 'boom' } }, 500)

      const result = await bb('pr list --state merged', { port: server.port, env: noSleep })

      assert.equal(result.exitCode, 1)
      assert.match(result.stderr, /HTTP 500/)
      assert.equal(server.getCalls().length, 1)
    })
  })
})

describe('bb pr list transport failure', () => {
  it('Exits 1 and prints no rows when nothing listens on the API port', async () => {
    // Given no server listens on the API port
    const port = await closedPort()

    // When I list all pull requests as JSON
    const result = await bb('pr list --all --json', { port })

    // Then bb exits 1, prints no array, and says no response arrived
    assert.equal(result.exitCode, 1)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /error: no response from Bitbucket/)
  })
})
