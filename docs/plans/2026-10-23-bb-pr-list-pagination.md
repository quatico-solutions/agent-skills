# `bb pr list` pages past 50 rows and filters by update time

> `bb pr list --limit 1000` returns 50 rows without a warning; callers cannot page or read only what changed.

## Status

- **Phase:** Delivered
- **Type:** feature
- **Issue:** #98
- **Sprint:** bb-pr-reads
- **Review:** in-session
- **Impl:** own branches
- **Rounds:** 2
- **Approved:** 2026-10-23, jwloka, in-session
- **Started:** 2026-10-23, jwloka, `feature/bb-pr-list-pagination`
- **Delivered:** 2026-10-23

## Changelog

- `bb pr list --limit <n>` follows Bitbucket's `next` links until it has `n` rows; `--all` reads every page.
- `bb pr list --updated-since <ISO date>` lists only PRs updated on or after that time.
- `bb pr list` without `--limit` prints a warning on stderr when more than the default 50 rows exist.
- Every `bb` command that reads a paged listing retries a page that answers HTTP 429 up to 3 times before it fails.

## Motivation

`bb pr list --state merged --limit 1000 --json number --jq length` prints `50` (bb 1.11.2). Any caller that matches PRs against the merged list reads PRs older than the newest 50 as "no PR". On 2026-10-23 the same command against `quatico/ewz-kus-portal` answered `HTTP 429` instead. `bb_paginate` exits on the first non-2xx page, so a rate limit on page 7 discards pages 1–6.

This plan serves direct `bb` callers. Plot's `plot-host.sh` does not call `bb pr list`. Its listing calls `bb api …/pullrequests?state=X&pagelen=50` once per state (`bb_state_listing`, plot-host.sh:1286), and it already filters with `updated_on>=` through `q=`. Its comment says `bb pr list` refuses `--limit`, which is no longer true. plot-pm/plot#2400 covers switching that listing to `bb pr list --all` once this ships.

## Design

### Approach

- `bb_paginate` (`cli/bb:193`) already follows `next`, but stops after 10 pages and sends no `pagelen`. Replace the fixed 10-page cap with the row limit: the loop stops when it has `limit` rows or `next` is empty. `cmd_pr_list` adds `pagelen=50` (the pull-request endpoint's maximum) to its own query. `bb_paginate` has 14 callers on endpoints whose maximum page size differs, so it sends no `pagelen` itself.
- `--all`: no row limit; follow `next` until it is empty. There is no ceiling: about 75 requests per state on a repository with 3700 PRs. Callers who want fewer rows use `--limit` or `--updated-since`.
- HTTP 429 on any page: wait for `Retry-After` when Bitbucket sends it, otherwise 1 s, 2 s, then 4 s. After 3 retries on one page, exit non-zero with `error: rate limited after <n> rows`. The pages already read are not printed, so a short list never looks complete. Other non-2xx answers fail on the first attempt, as today. Tests set `BB_RETRY_BASE_MS=0` so they do not sleep. `sleep` with a whole number of seconds stays bash 3.2-safe.
- Truncation: `bb_paginate` reports to its caller whether a `next` link was left when it stopped, and prints nothing itself. `cmd_pr_list`, when no `--limit` was given and a `next` link was left, prints `warning: listing truncated at 50 rows; use --limit or --all` on stderr. An explicit `--limit` is the caller's choice and stays silent, as in `gh`. Stdout stays pure JSON.
- `--updated-since <ISO>`: add `updated_on >= "<ISO>"` to the `q=` expression. The bound is inclusive, as in plot-host's existing query: a caller that reads again from its last watermark gets the PR at the boundary twice, never zero times. `bb_pr_list_query` builds both the `state=` and `q=` forms; this filter forces the `q=` form, like `--author` does today.
- No `--sort`, although #98 asks for one. Bitbucket already returns PRs newest-updated first, and `--updated-since` filters on the server, so no caller has to stop at a watermark. A caller that needs another order gets a flag then.
- Update `pr list` help text and `skills/working-with-bitbucket-api/SKILL.md`.

### Open Points

- [x] Reproduce the 50-row cap against a live repo first: the 10-page cap with Bitbucket's default `pagelen` does not obviously give 50. The fix depends on which limit actually fires. (Not reproduced live; see Notes.)
- [x] Does `plot-host.sh` pass `--limit` to `bb`? No. It never calls `bb pr list` for its listing; see Motivation. That change belongs to the plot repo.
- [x] File the plot-repo issue: plot-pm/plot#2400 switches `bb_state_listing` to `bb pr list --all` and removes the stale "refuses --limit" comment.

### Verification

- **Mock suite:** `tests/pr-list.test.ts` serves pages through `stubWithQuery` on `page=`, with `next` links. The mock server gains a sequenced stub (first answer 429 with `Retry-After`, then 200), so the retry path runs in CI on Linux and on macOS with bash 3.2.
- **Live check, read-only, on `quatico/ewz-kus-portal`:** once per branch, before its PR is marked ready, run from the branch's `cli/bb`. Every command is a GET request.
  - `bb pr list --state merged --limit 120 --json number --jq length` prints `120`
  - `bb pr list --state merged --all --json number --jq length` prints more than 3000, with no warning on stderr
  - `bb pr list --state merged --json number --jq length` prints `50` and the truncation warning on stderr
  - `bb pr list --state merged --updated-since 2026-10-01 --json updatedAt --jq 'map(select(.updatedAt < "2026-10-01")) | length'` prints `0`
  - the output of each command goes into the PR description

## Slices

### pr list pagination (Branch: feature/bb-pr-list-pagination, PR: #103)

- `feature/bb-pr-list-pagination` — `pagelen`, limit-derived page cap, `--all`, 429 retry, stderr truncation warning, `--updated-since`, with cases in `tests/pr-list.test.ts` <!-- builds: --all, --updated-since and the truncation warning on cmd_pr_list; 429 retry and leftover-page report in bb_paginate; sequenced stubs in mock-server -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- 2026-10-23, 50-row cap: two runs of the repro on `quatico/ewz-kus-portal` both answered `HTTP 429` on page 1, so no row count was observed. One single-page read showed `pagelen: 10` and `size: 3519` for `state=MERGED`. With 10 pages of 10 rows, the old loop reaches 100 rows at `--limit 1000`, not 50. None of the three named limits (page size, page cap, `--limit` handling) alone gives 50 from the code; the reporter's 50 most likely came from a run without `--limit` (default 50). The change removes all three limits, so the fix does not depend on the cause.

- Deliverable search: `bb_paginate` (`cli/bb:193`) and `bb_pr_list_query` (`cli/bb:445`) exist and are extended, not duplicated.

<!-- CHALLENGE-THE-PLAN-METADATA
{
  "round": 2,
  "questionHistory": [
    {"q": "Live verification target?", "a": "quatico/ewz-kus-portal, read-only GETs, once per branch, output in the PR", "category": "technical"},
    {"q": "Truncation warning when --limit stops a listing?", "a": "Only when no --limit was given", "category": "ux"},
    {"q": "Does --sort earn its place?", "a": "Dropped; Bitbucket sorts by -updated_on and --updated-since filters server-side", "category": "tradeOffs"},
    {"q": "--updated-since inclusive or exclusive?", "a": "Inclusive >=, as plot-host", "category": "domain"},
    {"q": "plot-host never calls bb pr list; what does #98 serve?", "a": "Direct bb callers; a plot-repo issue covers switching plot-host to bb pr list --all", "category": "domain"},
    {"q": "What should pagination do on HTTP 429?", "a": "Retry with Retry-After or 1/2/4 s backoff, max 3 per page, then fail naming rows read", "category": "nonFunctional"},
    {"q": "Should --all have a ceiling?", "a": "No ceiling; rely on retry, --limit and --updated-since", "category": "nonFunctional"}
  ],
  "deferredItems": [],
  "categoriesCovered": {
    "technical": {"stack": true, "architecture": true, "implementation": true},
    "domain": true,
    "ux": {"happyPath": true, "edgeCases": true, "errors": true, "accessibility": false},
    "nonFunctional": {"security": false, "performance": true, "scalability": true},
    "tradeOffs": true
  }
}
END-CHALLENGE-THE-PLAN-METADATA -->
