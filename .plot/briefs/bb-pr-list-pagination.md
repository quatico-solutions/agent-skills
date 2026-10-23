# Implementation brief — bb-pr-list-pagination

- **Plan (canonical):** `docs/plans/2026-10-23-bb-pr-list-pagination.md` on `main`
- **Approved:** 2026-10-23, jwloka, in-session
- **Branch:** `feature/bb-pr-list-pagination` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`. Do not merge it yourself.
- **Review of the code:** normal PR review; CI runs `ci.yml` and `bb-tests.yml` (Linux **and** macOS with `/bin/bash` 3.2)
- **Sprint:** `bb-pr-reads` (2026-10-26 to 2026-10-30), Must Have, release target 3.18.0

One slice, one wave. Nothing in this repo waits on it; plot-pm/plot#2400 (plot repo) switches plot's Bitbucket listing to `bb pr list --all` once this ships. `bug/bb-pr-view-json-fields` runs at the same time in the same file; see the scope guard.

## What to build

`bb pr list --state merged --limit 1000 --json number --jq length` prints `50` (bb 1.11.2, issue #98). On 2026-10-23 the same command against `quatico/ewz-kus-portal` answered `HTTP 429`, and `bb_paginate` exits on the first non-2xx page, so pages already read are lost.

Build:

1. **`bb_paginate` (`cli/bb:193`):** the loop stops when it holds `limit` rows or `next` is empty — the fixed `page -lt 10` cap goes. A 429 on any page is retried (below). It reports to its caller whether a `next` link was left when it stopped, and prints no warning itself.
2. **`cmd_pr_list` (`cli/bb:730`):** `pagelen=50` in its own query; `--all` (no row limit); `--updated-since <ISO>`; the truncation warning on stderr when no `--limit` was given and a `next` link was left.
3. **`bb_pr_list_query` (`cli/bb:445`):** `--updated-since` adds `updated_on >= "<ISO>"` and forces the `q=` form, like `--author` does.
4. **`tests/.build/dev/mock-server.ts`:** a sequenced stub (first answer 429 with `Retry-After`, then 200) for the retry tests.
5. Help text of `pr list`, and the `pr list` section of `skills/working-with-bitbucket-api/SKILL.md`.

The plan is canonical; this brief is orientation.

## First step: reproduce the 50-row cap

The plan's one open point. The current loop allows 10 pages and sends no `pagelen`; that does not obviously produce exactly 50 rows. Before changing the loop, run from `main`'s `cli/bb`, read-only, on `quatico/ewz-kus-portal`:

```
BB_DEBUG=1 cli/bb -R quatico/ewz-kus-portal pr list --state merged --limit 1000 --json number --jq length
```

(or count the requests another way if `BB_DEBUG` does not exist). Record in the plan's Notes which limit fired — page size, page cap, or `--limit` handling — and tick the open point. If the cause is none of the three the plan names, report it before building. Expect a 429: wait and run it once more; do not loop.

## Decisions the plan settles — do not re-derive them

**`pagelen` belongs to `cmd_pr_list`, not to `bb_paginate`.** Checked at dispatch: `bb_paginate` has 14 callers (`grep -n 'bb_paginate' cli/bb`): PR comments, diffstat, activity, branches, tags, code search, downloads and more. Bitbucket's maximum page size differs per endpoint, so a global `pagelen=50` changes every listing and can break one. The PR endpoint takes 50.

**The 429 retry belongs to `bb_paginate`.** Every listing loses its pages to a rate limit today, so every caller gets the fix. Wait `Retry-After` seconds when the header exists, otherwise 1 s, 2 s, then 4 s; at most 3 retries per page; then exit non-zero with `error: rate limited after <n> rows`. Rows already read are **not** printed — a short list must never look complete. Every other non-2xx fails on the first attempt, as today. `BB_RETRY_BASE_MS=0` makes the tests not sleep; `sleep` with whole seconds stays bash 3.2-safe.

**`bb_paginate` prints no warning.** It runs inside `$(…)`, so it cannot hand the caller a second value through stdout. Report "a `next` link was left" through a file the caller names, for example `BB_PAGINATE_NEXT_FILE` — the same shape plot's `bb_state_listing` uses (`BB_LIST_NEXT_FILE`). Only `cmd_pr_list` turns it into the warning, and only when no `--limit` was given: an explicit `--limit` is the caller's choice, as in `gh`.

**No `--sort`.** #98 asks for one; the plan drops it. Bitbucket returns PRs newest-updated first, and `--updated-since` filters on the server, so no caller has to stop at a watermark.

**`--updated-since` is inclusive (`>=`).** Same as plot-host's existing query. A caller that reads again from its last watermark gets the boundary PR twice, never zero times.

**`--all` has no ceiling.** About 75 requests per state on ewz-kus-portal. Callers who want fewer use `--limit` or `--updated-since`; the retry covers the rate limit.

**Rules this repo keeps re-learning:**
- Bash 3.2: no `declare -A`, no `${var^^}`, no `mapfile`; under `set -u`, expand a possibly-empty array as `${arr[@]+"${arr[@]}"}` (AGENTS.md Critical Rule 3).
- stdout stays pure JSON with `--json`; every warning goes to stderr.
- The `q=` and `state=` query forms must not be mixed (`bb_pr_list_query`'s comment says why).

## Done when

The plan's `### Verification` section is the specification:

- `tests/pr-list.test.ts` serves pages through `stubWithQuery` on `page=` with `next` links, and covers: `--limit 120` across 3 pages; `--all`; the warning present without `--limit` and absent with it; `--updated-since` in the `q=` expression, alone and with `--author`; a 429 then 200 on one page (succeeds); four 429s (fails, prints no rows).
  - Assert the request count, not only the output — a loop that fetches one page too many passes an output check.
  - Assert `pagelen=50` on the `pr list` request **and** its absence on one other `bb_paginate` caller (e.g. `pr comments`), which catches a `pagelen` that leaked into `bb_paginate`.
  - The four-429 test asserts empty stdout, which catches a partial list printed before the error.
- Live check, read-only, on `quatico/ewz-kus-portal`, from this branch's `cli/bb`, once before the PR is marked ready. Paste the output into the PR description:
  - `bb pr list --state merged --limit 120 --json number --jq length` prints `120`
  - `bb pr list --state merged --all --json number --jq length` prints more than 3000, with no warning on stderr
  - `bb pr list --state merged --json number --jq length` prints `50` and the truncation warning on stderr
  - `bb pr list --state merged --updated-since 2026-10-01 --json updatedAt --jq 'map(select(.updatedAt < "2026-10-01")) | length'` prints `0`

Plus the repo gates (AGENTS.md § Definition of Done): `pnpm test`, `pnpm run validate`, and `(cd skills/working-with-bitbucket-api/tests && pnpm test)`. Run all three before each push. Plot's `plot-local-checks.mjs` maps no command in this repo; use these instead. Add a changeset (`pnpm changeset`): root `minor`, `bumps:` → `working-with-bitbucket-api: minor`; indent `tuned-against:` by exactly two spaces if you add it. **Do not edit `BB_VERSION` in `cli/bb`** — the release commit bumps it.

## Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-open-pr.sh` (`--draft` while the work moves). Do not run `gh pr create`.
- When the PR exists, append `→ #<number>` to this branch's heading line in the plan's `## Slices` section.
- Commit style is Arlo's notation (`F - …` for the feature), per `skills/commit-notation/SKILL.md`.

## Scope guard

This branch owns `bb_paginate`, `bb_pr_list_query` and `cmd_pr_list` in `cli/bb`, `tests/pr-list.test.ts`, `tests/.build/dev/mock-server.ts`, the `pr list` part of `skills/working-with-bitbucket-api/SKILL.md`, and one changeset.

In flight at dispatch (2026-10-23): `bug/bb-pr-view-json-fields` owns `cmd_pr_view`, `tests/pr-view.test.ts` and the `pr view` part of `SKILL.md`. Do not touch those. Both branches edit `cli/bb` and `SKILL.md` in different functions and sections; the second PR to merge rebases. The other 13 `bb_paginate` callers change behaviour through the retry and the removed page cap only; do not edit them.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
