## Implementation brief — bb-scripted-calls (wave 2: rate-limit exit code)

- **Plan (canonical):** `docs/plans/2026-10-28-bb-scripted-calls.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `bug/bb-rate-limit-exit` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`
- **Review of the code:** green, CLEAN slice PRs are merged automatically by the operator's session loop; there is no human code review, so the tests are the review

Wave 1 (`bug/bb-transport-failure`, PR #117) is merged. `feature/bb-pr-list-head` waits on this branch, and so does nothing else.

### What to build

A rate limit exits 1 today, the status of every usage error and every other HTTP error, so a caller that checks the status cannot tell "wait and retry" from "fix the call". Make HTTP 429 exit **75** on every command, with a stderr line that says `rate limited` and never contains `429`.

Two paths reach a 429:

- **Listings (`bb_paginate`, `cli/bb:220`).** After the fifth retry (`cli/bb:262`) it prints `error: rate limited after <n> rows` and returns 1. Return 75. Append ` — Bitbucket asked to wait <s> s` only when the **final** 429 response carries `Retry-After`; read it from `hdr_file` **before** `rm -f "$hdr_file"` at `cli/bb:261`, and print the raw value, not the 60 s cap the retry loop applies (`cli/bb:250`). An hourly quota reported as "60 s" is the wrong advice.
- **Single requests (`bb_check_status`, `cli/bb:171`, added by #117).** A 429 there prints `error: HTTP 429 — <msg>` and returns 1, with no retry. Make it print `error: rate limited` and return 75. `bb_api_call`, `bb_api_raw` and `bb_download_upload` do not capture headers, so this line names no wait unless you add `-D` to those curl calls; adding it is in scope only if it stays small. No retry for single requests — that is a follow-up (plan Open Points).

Then make 75 reach the process exit status. These sites turn it back into 1 today:

| Site | Today | Change |
|---|---|---|
| `cli/bb:200`, `:297`, `:341` | `bb_check_status … \|\| return 1` | return the helper's status |
| `cli/bb:922`, `:930` (`cmd_pr_list`) | `\|\| { rm -f "$next_file"; exit 1; }` | exit with the callee's status |
| `cli/bb:1577`, `:2611` (`bb_download_upload` callers) | `\|\| exit 1` | pass the status through |
| `cli/bb:1751`, `:2155` (`bb_api_call` callers) | `\|\| exit 1` | pass the status through |
| `cli/bb:2654` (`download list`) | `\|\| exit 1` | pass the status through |
| `cli/bb:141`, `:149` (`bb_resolve_user`) | `\|\| prs="[]"` — a 429 becomes "cannot resolve reviewer" | on status 75, return 75 instead of an empty list |

The ten bare `result="$(bb_paginate …)"` sites (e.g. `cli/bb:1057`, `:1905`, `:2087`) already pass a non-zero status through under `set -euo pipefail` — probed on `/bin/bash` 3.2.57 in panel round 1. Leave them.

Document the codes: `bb --help` lists 0 success, 1 error, 75 rate limited, and jq's own codes under `--jq`; `skills/working-with-bitbucket-api/SKILL.md` gets the same list next to the exit-status paragraph #117 added.

The plan is canonical; this is orientation.

### Settled — do not re-derive

- **75, not 4.** 75 is `EX_TEMPFAIL` in `sysexits.h`. 4 was rejected: gh uses it for "authentication required", and Plot reads 4 as "cannot be asked, do not retry" for the `bb` codes it passes through (`pr merge`, `pr create`, `pr edit`). #111 suggests 4; the plan records why not.
- **Never `429` in the message.** Plot's `host_failure_kind` (`plot-host.sh`, `~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/plot-host.sh:780`) classifies stderr containing `429` as `secondary` (a short burst) and `rate limit` as `throttled` (a spent quota). Keep the words `rate limited`.
- **Never promise the wait.** Atlassian documents a rolling one-hour limit and `X-RateLimit-*` headers; panel round 1 found no statement that a 429 carries `Retry-After`. The suffix appears only when the header is there.
- **`set -e` does not carry the status for you** inside `$(…)` called under `||` — bash 3.2 has no `inherit_errexit`. Use `|| exit $?` / `|| return $?`, or capture `rc=$?` explicitly. In a `||` block, `$?` is still the callee's status only in its first command: `|| { rc=$?; rm -f …; exit "$rc"; }`.
- **No partial array.** A listing that stops on 429 prints nothing on stdout — the `bb-paginate-backoff` rule.
- **bash 3.2 only** (AGENTS.md rule 3).

### Done when

- `tests/pr-list.test.ts:678` changes from `assert.equal(result.exitCode, 1)` to `75`, and its stderr assertion still matches `error: rate limited after 1 rows`. This is the intended change, not a regression.
- A final 429 with `Retry-After: 3600` prints `— Bitbucket asked to wait 3600 s` (catches the 60 s cap leaking into the message) and exits 75.
- A final 429 without `Retry-After` prints no wait suffix.
- `bb api /user` against a stubbed 429 exits 75 and its stderr does not match `/429/` (catches the `bb_check_status` path and Plot's classifier).
- `bb pr create --reviewer <name>` while the user lookup answers 429 exits 75, not "cannot resolve reviewer" (catches `bb_resolve_user`).
- `bb download list` against a stubbed 429 exits 75 (catches `cli/bb:2654`).
- An HTTP 500 still exits 1 (catches a blanket "non-2xx is 75").

The mock server supports sequences and headers: see `server.stubSequence(…, [{ status: 429, body, headers: { 'Retry-After': '0' } }])` in `tests/pr-list.test.ts:601`. Use `env: { BB_RETRY_BASE_MS: '0' }` so retries do not sleep.

Plus the repo gates: `pnpm test`, `pnpm run validate`, the `bb` suite (`cd skills/working-with-bitbucket-api/tests && pnpm test`) green on Linux and macOS `/bin/bash` 3.2, and a changeset (`pnpm changeset`) with a `bumps:` block for `working-with-bitbucket-api`. Run `node ~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `plot-open-pr.sh` (`--draft` while it moves), never `gh pr create`. Mark it ready only when every check above passes locally: a ready, green, CLEAN PR is merged automatically.
- When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section.

### Scope guard

This branch owns: the 429 handling in `bb_paginate` and `bb_check_status`, the status pass-through at the sites listed above, the exit-code list in `bb --help` and `SKILL.md`, the tests for them, one changeset.

Not this branch:
- `--head` and `bb_pr_list_query` → `feature/bb-pr-list-head` (waits on this branch; it also edits `cmd_pr_list` and `tests/pr-list.test.ts`, so keep your edits there to the two exit sites and the 429 cases)
- `cmd_api` path handling → `bug/bb-api-path-slash`
- a retry schedule for single requests → follow-up, not planned
- `bb whoami` → `feature/bb-whoami`; `--version` text → `feature/bb-install-source` (both on their own branches, worked by a person)

If you find something the plan did not anticipate, report it rather than improvising outside scope.
