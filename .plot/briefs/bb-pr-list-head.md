## Implementation brief — bb-scripted-calls (wave 3: pr list --head)

- **Plan (canonical):** `docs/plans/2026-10-28-bb-scripted-calls.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `feature/bb-pr-list-head` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`
- **Review of the code:** green, CLEAN slice PRs are merged automatically by the operator's session loop; there is no human code review, so the tests are the review

Waves 1 and 2 are merged (#117 transport failure, #119 exit 75). `bug/bb-api-path-slash` (wave 4) becomes claimable when this branch merges.

### What to build

There is no way to ask `bb` for the PRs of one branch. Finding the merged PR of a deleted branch in `quatico/ewz-kus-portal` meant `bb pr list --state merged --all` — 3532 PRs, dozens of requests under a rate limit — or a hand-built `bb api '…/pullrequests?q=source.branch.name="…"'` (#111).

Add `--head <branch>` to `cmd_pr_list` (`cli/bb:796`):

- **Repeatable**, accumulating like `--author` (`cli/bb:895`, `bb_str_contains_line` de-duplicates).
- **Query:** in `bb_pr_list_query` (`cli/bb:498`) add `(source.branch.name = "<a>" OR source.branch.name = "<b>")`, ANDed with the states, the authors and `--updated-since`. `--head` forces the `q=` form, exactly as `--author` and `--updated-since` do today (`cli/bb:503`): the `state=` form cannot carry it.
- **Both calls pass the heads.** `cmd_pr_list` calls `bb_pr_list_query` twice: the main query (`cli/bb:934`) and the zero-row author refetch (`cli/bb:945`), which rebuilds the query without authors and filters by display name on the client. If the refetch drops the heads, `--author X --head b` silently lists every branch's PRs by X.
- **Refuse a `"` in a branch name** with a usage error (`error: --head cannot contain '"'`), exit 1. Git allows `"` in a branch name; Bitbucket's escape rule for BBQL strings is not documented, so the plan refuses rather than guesses.
- **Help:** add `--head <branch>` to USAGE and FLAGS, and the example for #111's own case: `bb pr list --head <branch> --state merged`. `--head` alone keeps the OPEN default, so a merged branch needs `--state merged`.

The plan is canonical; this is orientation.

### Settled — do not re-derive

- **`source.branch.name = "x"` is correct BBQL** for the pull-request endpoint, and combines with `state = "…"` inside one `q=` (panel round 1, `bitbucket-api` juror, from Atlassian's examples).
- **Clause order is fixed:** `(states) AND (heads) AND (authors) AND updated_on >= …`. Tests assert the decoded `q=`; a fixed order keeps them stable. Pass heads as a new 4th parameter of `bb_pr_list_query` (keep `since` 3rd; callers outside `cmd_pr_list` do not exist — grep to confirm).
- **No client-side branch filtering.** One request with `q=` is the point; `--all` plus jq is what #111 had to do.
- **Exit codes from #119 stay intact.** Both `bb_paginate` calls end in `|| { rc=$?; rm -f "$next_file"; exit "$rc"; }` (`cli/bb:938`, `:946`) so 75 reaches the caller. Do not touch those lines beyond the query argument.
- **`--author` has the same unescaped-`"` gap.** Out of scope (plan Open Points); do not fix it here.
- **bash 3.2 only** (AGENTS.md rule 3). `bb_pr_list_query` already sets `IFS=$'\n'` for its loops; reuse that pattern.

### Done when

In `skills/working-with-bitbucket-api/tests/pr-list.test.ts`, asserting the decoded `q=` the mock server received:

- `--head b` → `(state = "OPEN") AND (source.branch.name = "b")`. Catches the default-state rule.
- `--head a --head b --state merged` → one request, `(state = "MERGED") AND (source.branch.name = "a" OR source.branch.name = "b")`. Catches repetition and the single request.
- `--head b --author x` where the author query returns zero rows → the refetch's `q=` still contains `source.branch.name = "b"`. **This is the case a naive implementation passes without**; it is the silent-wrong-output bug three jurors found.
- `--head b --updated-since 2026-10-01T00:00:00Z` → all three clauses in the fixed order.
- `--head 'we"ird'` → exit 1, usage error, no request sent.
- `--head` with `--all` follows `next` links as today.

Plus the repo gates: `pnpm test`, `pnpm run validate`, the `bb` suite (`cd skills/working-with-bitbucket-api/tests && pnpm test`) green on Linux and macOS `/bin/bash` 3.2, and a changeset (`pnpm changeset`) with a `bumps:` block for `working-with-bitbucket-api` (minor: a new flag). Run `node ~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `plot-open-pr.sh` (`--draft` while it moves), never `gh pr create`. Mark it ready only when every check above passes locally: a ready, green, CLEAN PR is merged automatically.
- When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section.

### Scope guard

This branch owns: `--head` parsing and help in `cmd_pr_list`, the heads parameter of `bb_pr_list_query`, the `--head` tests in `tests/pr-list.test.ts`, the `--head` line in `skills/working-with-bitbucket-api/SKILL.md`, one changeset.

Not this branch:
- `cmd_api` path handling → `bug/bb-api-path-slash` (next wave)
- exit codes and 429 handling → merged in #119
- `--author` escaping → open point, not planned
- `bb whoami` → `feature/bb-whoami`; `--version` text → `feature/bb-install-source` (both worked by a person on their own branches)

No other branch is in flight in `cmd_pr_list` right now.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
