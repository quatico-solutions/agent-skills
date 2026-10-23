# `bb pr list` pages past 50 rows, sorts, and filters by update time

> `bb pr list --limit 1000` returns 50 rows without a warning; callers cannot page, sort, or read only what changed.

## Status

- **Phase:** Draft
- **Type:** feature
- **Issue:** #98
- **Sprint:** bb-pr-reads
- **Review:** in-session
- **Impl:** own branches

## Changelog

- `bb pr list --limit <n>` follows Bitbucket's `next` links until it has `n` rows; `--all` reads every page.
- `bb pr list --sort <field>` (e.g. `-updated`) and `--updated-since <ISO date>` support incremental reads.
- `bb pr list` prints a warning on stderr when a page cap stops a listing early.

## Motivation

`bb pr list --state merged --limit 1000 --json number --jq length` prints `50` (bb 1.11.2). Any join against the merged list reads PRs older than the newest 50 as "no PR". Plot's `plot-host.sh` reports the cap on every call, and `bb api` is no escape (HTTP 403 with an app password). plot-pm/plot#2385 proposes an append-only PR index that needs `--sort -updated` and `--updated-since`.

## Design

### Approach

- `bb_paginate` (`cli/bb:193`) already follows `next`, but stops after 10 pages and sends no `pagelen`. Send `pagelen=50` (the Bitbucket maximum) and derive the page cap from `--limit` instead of the fixed 10.
- `--all`: no row limit; follow `next` until it is empty.
- Truncation: when the loop stops with a `next` link still present, print `warning: listing truncated at <n> rows; use --limit or --all` on stderr. Stdout stays pure JSON.
- `--sort <field>`: pass through as Bitbucket `sort=` (`-updated_on`, `created_on`, …). Accept the gh-style names `updated`/`created` and map them.
- `--updated-since <ISO>`: add `updated_on > <ISO>` to the `q=` expression. `bb_pr_list_query` builds both the `state=` and `q=` forms; this filter forces the `q=` form, like `--author` does today.
- Update `pr list` help text and `skills/working-with-bitbucket-api/SKILL.md`.

### Open Points

- [ ] Reproduce the 50-row cap against a live repo first: the 10-page cap with Bitbucket's default `pagelen` does not obviously give 50. The fix depends on which limit actually fires.
- [ ] Does `plot-host.sh` pass `--limit` to `bb` at all? Its message says Bitbucket "ignores" it; if plot-host drops the flag itself, that needs a separate change in the plot repo.

## Branches

- `feature/bb-pr-list-pagination` — `pagelen`, limit-derived page cap, `--all`, stderr truncation warning, `--sort`, `--updated-since`, with cases in `tests/pr-list.test.ts` <!-- builds: --all, --sort and --updated-since on cmd_pr_list; truncation warning in bb_paginate -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Deliverable search: `bb_paginate` (`cli/bb:193`) and `bb_pr_list_query` (`cli/bb:445`) exist and are extended, not duplicated.
