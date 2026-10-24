# bb 429 backoff, release App and release 3.18.1

**Date:** 2026-10-24
**Source:** Claude Code

## Summary

Closed the open items from the 3.18.0 sessionlog (`2026-10-24-bb-pr-reads-sprint.md`). `bb` paged listings now wait out Bitbucket's rate limit, and `bb pr list --state merged --all` on `quatico/ewz-kus-portal` returns 3522 rows. The release PR now comes from a GitHub App, and its checks run without a manual approval. Both shipped in agent-skills 3.18.1 (bb 1.12.1).

## Key Accomplishments

- Plan `bb-paginate-backoff` (`docs/plans/2026-10-24-bb-paginate-backoff.md`): approved in-session, implemented in PR #106, delivered, and recorded as Released v3.18.1.
- `bb_paginate` (`cli/bb`) retries an HTTP 429 up to 5 times per page, waiting 2, 4, 8, 16 and 32 s, or `Retry-After` capped at 60 s, and prints `bb: rate limited, retrying in <n> s (<k>/5)` on stderr before each wait.
- PR #108 added the missing `retrying in 0 s (1/5)` assertion for `Retry-After: 0`, which the delivery review found.
- PR #105: `release.yml` mints a token with `actions/create-github-app-token@v2` when `RELEASE_APP_ID` is set. The App `quatico-agent-skills-release` opened release PR #107, and its checks started with no "Awaiting approval".
- Release PR #107 merged pinned to its head `43600bc`; tag and GitHub release `v3.18.1` published 2026-10-24.
- `plan:*` labels created in this repository: `plan:draft`, `plan:approved`, `plan:delivered`, `plan:design`, `plan:released`.
- `bb` installed from Homebrew (`quatico-solutions/tap/quatico-bb`, 1.12.0 at install time); the old `~/.local/bin/bb` launcher moved to the Trash.
- Plot gaps filed: plot-pm/plot#2528, #2529, #2530, #2531, #2532 and #2533.
- 771 plot temp entries older than 24 h swept with `plot-reap.sh --sweep-temp --yes`.

## Changes Made

- Created: `docs/plans/2026-10-24-bb-paginate-backoff.md`, `.changeset/20261024-bb-paginate-backoff.md` (consumed by release 3.18.1)
- Modified: `cli/bb`, `skills/working-with-bitbucket-api/SKILL.md`, `skills/working-with-bitbucket-api/tests/pr-list.test.ts`, `.github/workflows/release.yml`, `docs/rules/versioning.md`, `docs/plans/2026-10-23-bb-pr-list-pagination.md`
- Outside the repository: GitHub App `quatico-agent-skills-release` (org-owned, installation 174783042) and the secrets `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY`, set by the operator

## Decisions

- **Backoff of 5 retries, cap 60 s**, chosen by the operator over a documented limit. On 2026-10-24 Bitbucket answered three requests in a row `429 200 429` and sent no `Retry-After` or rate-limit headers, so it throttles bursts.
- **The schedule has no margin on the largest repository.** The live `--all` run took 375 s; 37 pages were rate-limited, and the retries needed per page were 1 (23 pages), 2 (7), 3 (5), 4 (1) and 5 (1). A failure at `(5/5)` calls for a 6th retry or a pause between pages.
- **The stderr retry line makes the schedule testable** with `BB_RETRY_BASE_MS=0`, which skips the sleep but keeps the logged wait.
- **A GitHub App, not a PAT, opens the release PR.** Since GitHub's 2026-06-11 change, PRs opened by `github-actions[bot]` run workflows only after a write-access approval. The workflow falls back to `GITHUB_TOKEN` when the secrets are absent.
- **PR #108 adds no changeset.** It changes a test only and shipped under the pending backoff changeset; the reconcile scan still reports it as `no_changeset=1`.
- **Merges are pinned** with `--match-head-commit`, which plot's controller gate requires.

## Open Points

- The 50-row cap reported for #98 is still unexplained; the open point in `bb-pr-list-pagination` is reopened.
- `plot-reconcile-scan.sh` reports `no_changeset=1` for PR #108 until it leaves the 40-merge window.
- About 12,000 `$TMPDIR/plot-*` entries younger than 24 h remain, about 9,900 of them `plot-host-*` folders holding a stub `bb` and a `budget-home`, created between 2026-10-23 21:36 and 2026-10-24 04:00 while this repository's fleet was stopped. Their source is unknown.

## Next Steps

- [ ] Find the source of the `plot-host-*` temp folders, and file a plot issue if plot's own tests or scripts leave them.
- [ ] Reproduce the 50-row cap, or close the open point in `bb-pr-list-pagination` as not reproducible.
- [ ] Re-fill the fleet unit on the next `/plot-fleet --start` with `PLOT_FLEET_LABEL=com.plot-pm.fleetd.agent-skills`; it still names the `plot/2.28.0` paths.

## Repository State

- Committed: `b557719` - plot: release bb-paginate-backoff (v3.18.1)
- Branch: `main`, in sync with `origin/main`; Release workflow green on `ca9d7b9`
- Released: `v3.18.1` (bb 1.12.1)
