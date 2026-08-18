import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createMockServer, type MockServer } from './.build/dev/mock-server.ts'
import { bb } from './.build/dev/run-bb.ts'
import prListWithCommits from './fixtures/pr-list-open-with-commits.json' with { type: 'json' }
import statusesSuccessful from './fixtures/statuses-successful.json' with { type: 'json' }
import statusesFailed from './fixtures/statuses-failed.json' with { type: 'json' }
import statusesInProgress from './fixtures/statuses-inprogress.json' with { type: 'json' }
import statusesNone from './fixtures/statuses-none.json' with { type: 'json' }
import statusesInProgressThenFailed from './fixtures/statuses-inprogress-then-failed.json' with { type: 'json' }
import statusesFailedThenInProgress from './fixtures/statuses-failed-then-inprogress.json' with { type: 'json' }
import statusesSuccessfulThenFailed from './fixtures/statuses-successful-then-failed.json' with { type: 'json' }

// The head commits carried by pr-list-open-with-commits.json, in PR order.
const SHA_42 = '57318be74a3e1c9f0b2d4e6a8c0f2e4a6b8d0c2e'
const SHA_43 = '3e7b7676a885aefcb8b87ff68697edfef542afde'

const PRS = '/repositories/testws/testrepo/pullrequests'
const statusesPath = (sha: string) => `/repositories/testws/testrepo/commit/${sha}/statuses`

/** The `checks` value bb reported for each PR, keyed by PR number. */
async function checksByPr(server: MockServer, args: string) {
  const result = await bb(args, { port: server.port })
  assert.equal(result.exitCode, 0, `bb exited ${result.exitCode}: ${result.stderr}`)
  const rows = JSON.parse(result.stdout) as Array<{ number: number; checks: string }>
  return Object.fromEntries(rows.map((r) => [r.number, r.checks])) as Record<number, string>
}

describe('bb pr list --json checks', () => {
  let server: MockServer

  before(async () => { server = await createMockServer() })
  after(() => server.stop())
  beforeEach(() => server.reset())

  it("Reports Bitbucket's own word for a successful build", async () => {
    // Given both PRs' head commits have one successful build
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesSuccessful)
    server.stub('GET', statusesPath(SHA_43), statusesSuccessful)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then it is spelled as Bitbucket spells it, not as gh would
    assert.equal(checks[42], 'SUCCESSFUL')
    assert.equal(checks[43], 'SUCCESSFUL')
  })

  it('Reports FAILED and INPROGRESS per PR', async () => {
    // Given one PR is failing and the other is still building
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesFailed)
    server.stub('GET', statusesPath(SHA_43), statusesInProgress)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then each PR carries its own answer — the statuses are resolved per commit
    assert.equal(checks[42], 'FAILED')
    assert.equal(checks[43], 'INPROGRESS')
  })

  it('Reports NONE when the commit has no statuses at all', async () => {
    // Given the head commit has never been built (HTTP 200, empty values)
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesNone)
    server.stub('GET', statusesPath(SHA_43), statusesNone)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then it is NONE — "no build ever ran", a fact about the repository
    assert.equal(checks[42], 'NONE')
  })

  it('Reports UNKNOWN when the statuses call fails', async () => {
    // Given the statuses endpoint errors for one PR
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), { error: 'boom' }, 500)
    server.stub('GET', statusesPath(SHA_43), statusesSuccessful)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then it is UNKNOWN — "I could not read the builds", a fact about this call.
    // The pairing that matters: an implementation returning NONE on error passes
    // every positive assertion above while reporting a clearance it never received.
    assert.equal(checks[42], 'UNKNOWN')
    assert.notEqual(checks[42], 'NONE')
  })

  it('Never reports UNKNOWN as SUCCESSFUL', async () => {
    // Given every statuses call fails
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), { error: 'boom' }, 500)
    server.stub('GET', statusesPath(SHA_43), { error: 'boom' }, 500)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then nothing wears the one word a reader acts on without checking.
    // This is the 22-day-green defect the whole feature exists to prevent.
    for (const pr of [42, 43]) assert.notEqual(checks[pr], 'SUCCESSFUL')
  })

  it('Lets a failure outrank an in-progress, whatever the order', async () => {
    // Given one commit reports INPROGRESS before FAILED, the other the reverse
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesInProgressThenFailed)
    server.stub('GET', statusesPath(SHA_43), statusesFailedThenInProgress)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then both collapse to FAILED — the one judgement bb makes must not depend
    // on which status the API happened to list first
    assert.equal(checks[42], 'FAILED')
    assert.equal(checks[43], 'FAILED')
  })

  it('Lets a failure outrank a success', async () => {
    // Given a commit with one green and one red build
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesSuccessfulThenFailed)
    server.stub('GET', statusesPath(SHA_43), statusesSuccessful)

    // When I ask for checks
    const checks = await checksByPr(server, 'pr list --json number,checks')

    // Then one red check means the set is not green
    assert.equal(checks[42], 'FAILED')
  })

  it('Issues no statuses call when checks is not requested', async () => {
    // Given PRs exist
    server.stub('GET', PRS, prListWithCommits)

    // When I ask only for fields the PR object already carries
    const result = await bb('pr list --json number,headRefName', { port: server.port })

    // Then the extra calls are never paid for — the field is opt-in, and this is
    // the assertion that proves it rather than assuming it
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCallsTo('GET', '/statuses').length, 0)
  })

  it('Issues no statuses call for a bare --json', async () => {
    // Given PRs exist
    server.stub('GET', PRS, prListWithCommits)

    // When I ask for the raw API objects
    const result = await bb('pr list --json', { port: server.port })

    // Then bare --json is unchanged: full objects, no extra calls
    assert.equal(result.exitCode, 0)
    assert.equal(server.getCallsTo('GET', '/statuses').length, 0)
  })

  it('Issues exactly one statuses call per PR when checks is requested', async () => {
    // Given two PRs with distinct head commits
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesSuccessful)
    server.stub('GET', statusesPath(SHA_43), statusesSuccessful)

    // When I ask for checks
    await checksByPr(server, 'pr list --json number,checks')

    // Then the cost is bounded at one call per PR — the head SHA comes from the
    // PR object, so no lookup is needed to find the commit
    assert.equal(server.getCallsTo('GET', '/statuses').length, 2)
  })

  it('Does not fail the command when one PR of several errors', async () => {
    // Given one statuses call errors and the other succeeds
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), { error: 'boom' }, 500)
    server.stub('GET', statusesPath(SHA_43), statusesSuccessful)

    // When I ask for checks
    const result = await bb('pr list --json number,checks', { port: server.port })

    // Then the command still succeeds and the healthy PR still reports
    assert.equal(result.exitCode, 0)
    const checks = await checksByPr(server, 'pr list --json number,checks')
    assert.equal(checks[42], 'UNKNOWN')
    assert.equal(checks[43], 'SUCCESSFUL')
  })

  it('Combines checks with the existing fields', async () => {
    // Given PRs with builds
    server.stub('GET', PRS, prListWithCommits)
    server.stub('GET', statusesPath(SHA_42), statusesSuccessful)
    server.stub('GET', statusesPath(SHA_43), statusesFailed)

    // When I ask for checks alongside fields projected from the PR object
    const result = await bb('pr list --json number,headRefName,state,checks', { port: server.port })

    // Then the projection is unchanged apart from the new key
    assert.equal(result.exitCode, 0)
    const rows = JSON.parse(result.stdout) as Array<Record<string, unknown>>
    assert.deepEqual(Object.keys(rows[0]).sort(), ['checks', 'headRefName', 'number', 'state'])
    assert.equal(rows[0].headRefName, 'feature/login')
    assert.equal(rows[0].state, 'OPEN')
  })

  it('Rejects an unknown field and names checks as supported', async () => {
    // Given PRs exist
    server.stub('GET', PRS, prListWithCommits)

    // When I ask for a field that does not exist
    const result = await bb('pr list --json number,bogus', { port: server.port })

    // Then it fails loudly, and the supported list now includes checks
    assert.notEqual(result.exitCode, 0)
    assert.match(result.stderr, /unknown field 'bogus'/)
    assert.match(result.stderr, /checks/)
  })
})
