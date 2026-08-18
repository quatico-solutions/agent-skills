# Implementation brief — bb-reports-pr-mergeability (wave 1: Checks)

- **Plan (canonical):** `docs/plans/2026-08-17-bb-reports-pr-mergeability.md` on `main`
- **Approved:** 2026-08-18, Jan Wloka, plan-PR #59 merged
- **Branch:** `feature/bb-reports-pr-checks` (base: `main`) — already claimed and pushed
- **Worktree:** `../plot-wt-feature-bb-reports-pr-checks`
- **Ends as:** one PR to `main`. Do not merge it yourself.
- **Review of the code:** normal PR review; CI runs `bb-tests` on Linux **and** macOS/bash 3.2

Wave 2 (`feature/bb-reports-pr-mergeability`) is **blocked until this merges** and
must stay that way. It begins with a measurement, and the cost model you establish
here is what it follows. Do not start it.

## What to build

`bb pr list --json` gains a `checks` field: the head commit's build statuses,
collapsed to one answer. `bb pr view --json` gains the same field, spelled the
same way.

The concrete failure this fixes: on 2026-08-17 a board showed PR #57 as **green**
while the host reported `CONFLICTING`. That branch had been unmergeable for **22
days**, wearing the one word a reader acts on without checking. The consumer's own
defect is being fixed there — but its Bitbucket path *cannot* be fixed, because it
hard-codes `checks:"unknown"` and its comment says why: `bb` reports neither fact.

Verified in this repo today, and stronger than the plan states: `statuses` appears
**zero** times in `bin/bb` (the plan said once). `bin/bb` is 2494 lines (plan said
~2300). The capability is entirely absent, not partially wired.

The plan is canonical. This is orientation.

## The decisions the plan settles — do not re-derive them

**The words are Bitbucket's, not GitHub's.** `checks` reports `SUCCESSFUL |
FAILED | INPROGRESS | STOPPED | NONE | UNKNOWN` — Bitbucket's own spelling. The
first draft mapped these onto gh's vocabulary and interrogation reversed it: `state`
already keeps Bitbucket's spelling (`OPEN`/`MERGED`/`DECLINED`/`SUPERSEDED`) and the
help text documents that as deliberate. Translating here would mean `bb` deciding
that `STOPPED` means `failing` — a judgement about the repository's conventions,
which `bb` does not have. A consumer wanting gh's words writes that `case` in its
own adapter, where it already writes every other mapping.

**`NONE` and `UNKNOWN` are different and must stay so.** *No build ever ran* is a
fact about the repository; *I could not read the builds* is a fact about this call.
An implementation that returns `NONE` on error passes every positive assertion in
the suite and reports a clearance it never received. That is the defect this whole
feature exists to prevent — do not collapse them.

**A failure outranks an in-progress.** Precedence: any `FAILED`/`STOPPED` wins,
else any `INPROGRESS`, else all-`SUCCESSFUL`. This is the only judgement `bb` makes
here, and it must not depend on the order statuses arrive in.

**The fields are opt-in, and that is a cost decision, not a style one.** Build
statuses are per-commit, so a naive `bb pr list` over twenty PRs becomes twenty-one
API calls. `checks` is computed **only when named in `--json`**. `--json
number,headRefName` must issue no extra calls; bare `--json` must stay
byte-identical to today.

**A long list warns on stderr and still answers.** A hard cap was considered and
rejected: it needs a guessed number, and it would make `UNKNOWN` mean *too many PRs*
alongside *could not read* — one label, two states, which is the defect above.

**One PR's failure does not fail the command.** That PR reads `UNKNOWN`; the others
report normally.

**No new subcommand.** These are fields on existing commands, not `bb pr checks`.
No verdict either — `bb` reports what the host says; deciding whether a failing
check matters is the consumer's.

## What the plan does not answer — measure before you build

**`bb_pr_json_projection()` (`bin/bb:425`) cannot host this field as-is.** Every
one of its ten existing fields is a pure jq projection over the already-fetched PR
object (`number: .id`, `headRefName: .source.branch.name`). Build statuses live at a
*different endpoint*, keyed by the head commit SHA. So `checks` is not a new `frag`
in that `case` — it needs a fetch-then-merge step before projection. Expect to
restructure, and keep the function's "subcommand-agnostic" property so `pr view`
reuses it as the comment promises.

**Whether the PR object even carries the head SHA is unverified.** Every fixture
here has `source: {branch: {name}}` and nothing else — no `commit.hash`. If the
real API returns `source.commit.hash`, the cost is one `/statuses` call per PR as
the plan assumes. If it does not, you need a lookup first and the cost model
doubles. **Measure this against a real repository before building**, and record the
answer in the plan.

**Record one real `/statuses` response and paste it into the plan before writing
fixtures.** This is a plan requirement, not a nicety: the fixtures in
`tests/fixtures/` are hand-written and minimal, so a fixture built from this
document would test the author's idea of the API rather than the API. It is a
manual step, once, and it is what keeps the suite honest.

## Carried-over rules

- **Absent is not false, and empty is not a pass.** Read the exit code, not the
  emptiness of the output. This repo has re-learned it more than once.
- **`BB_API_URL` is loopback-restricted on purpose** (`bin/bb:7`) — the auth token
  goes out as HTTP Basic on every call, so the mock redirect can never point at a
  remote host. Do not relax that to make a test easier.
- **bash 3.2 compatibility is a CI gate**, not a preference: no `declare -A`, no
  `${var^^}`, no `mapfile`; under `set -u` expand possibly-empty arrays as
  `${arr[@]+"${arr[@]}"}`. `bb-tests-macos` pins `/bin/bash` and will catch you.

## Done when

The plan's `## Done when` list is the specification. These are the assertions that
exist *because a naive implementation would pass without them*:

- **`NONE` vs `UNKNOWN` distinguishable** — a PR with no statuses reports `NONE`; one
  whose status call fails reports `UNKNOWN`. Catches the error-returns-`NONE` bug,
  which is invisible to every positive test.
- **`UNKNOWN` is never reported as `SUCCESSFUL`** — assert explicitly. This is the
  22-day-green defect.
- **Failure outranks in-progress regardless of order** — catches an implementation
  that reports whichever status it saw last.
- **Opt-in proven by call count** — assert `--json number,headRefName` issues no
  extra API calls. Catches a field computed eagerly and then discarded.
- **One erroring PR does not fail the list** — catches a `set -e` abort mid-loop.
- **`pr view` and `pr list` use identical spelling** — a consumer must not learn two
  spellings of one answer.
- **The ten existing fields unchanged**, `state` keeps its Bitbucket spelling.
- **`--help` documents both fields**, including that `unknown` is a real answer
  rather than a failure.

Plus this repo's gates (per `## Plot Config` → Definition of Done):

- `pnpm test` and `pnpm run validate` pass
- `pnpm test` in `skills/working-with-bitbucket-api/tests/` green on Linux **and**
  macOS/bash 3.2 — this branch touches `bin/bb`, so `bb-tests.yml` runs
- A changeset with a `bumps:` block for `working-with-bitbucket-api`

## Bookkeeping

- **When you open the PR, append `→ #<number>`** to this branch's line in the plan's
  `## Branches` section on `main`. `/plot-deliver` back-fills a missed one, but
  written-at-creation keeps the plan current.
- **Push the first real commit as soon as it exists** — the branch is claimed but
  currently empty, and an empty claim is indistinguishable from an abandoned one.

## Scope guard

This branch owns:

- `skills/working-with-bitbucket-api/bin/bb`
- `skills/working-with-bitbucket-api/tests/` (incl. `fixtures/`)
- `skills/working-with-bitbucket-api/SKILL.md` — the `--json` field list is **not**
  documented there today (checked); `bb --help` is the only place it lives, so that
  is what must gain the two fields
- one changeset file

Also in flight, verified at dispatch: `bug/bb-state-accumulates` (#60) holds
`docs/plans/2026-08-18-bb-state-accumulates.md` and its `active/` symlink — plan
files only, no overlap with `bin/bb`. It reports a related defect (repeated
`--state` flags silently keep only the last) whose resolution is deliberately still
open; **do not fix it here**.

If you find something the plan did not anticipate — especially if the head SHA is
not in the PR object — report it rather than improvising outside scope.
