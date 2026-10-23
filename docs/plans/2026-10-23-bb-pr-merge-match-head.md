# `bb pr merge --match-head-commit` pins a merge to the reviewed head

> `bb pr merge <id>` merges whatever the PR's head is at that moment; a caller cannot say which head it reviewed.

## Status

- **Phase:** Approved
- **Type:** feature
- **Issue:** #100
- **Sprint:** bb-pr-reads
- **Review:** in-session
- **Impl:** own branches
- **Approved:** 2026-10-23, jwloka, in-session
- **Started:** 2026-10-23, jwloka, `feature/bb-pr-merge-match-head`

## Changelog

- `bb pr merge <id> --match-head-commit <sha>` merges only when the PR's head commit matches `<sha>`, and otherwise exits 1 with `head moved` and merges nothing.

## Motivation

`gh pr merge --match-head-commit <sha>` refuses a merge when the PR moved after review. `bb pr merge` has no equivalent (`[--squash|--merge] [--delete-branch] [--json]`), so a caller on Bitbucket checks the head by hand right before merging. Issue #100 reports this from ewz-kus-portal on 2026-10-23.

Plot already performs this check for its own Bitbucket merges: `plot-host.sh pr-merge --match-head` (plot 2.28.0, `plot-host.sh:4125`) reads `source.commit.hash` through `bb pr view --json`, compares it with the pin, and calls `bb pr merge` only on a match. This plan gives direct `bb` callers the same check, with the same matching rule.

## Design

### Approach

- In `cmd_pr_merge` (`cli/bb:1554`), add `--match-head-commit <sha>`. With the flag, `GET /pullrequests/<id>` first, read `source.commit.hash`, compare, and send the merge `POST` only on a match.
- **Matching is a prefix match in both directions**, the rule `plot-host.sh:4125` uses: lowercase both values; both must be 7 or more hex digits; they match when either is a prefix of the other. Bitbucket returns a 12-character hash (`35ed68c05967` for ewz-kus-portal PR 3712, measured 2026-10-23), so a 40-character SHA from `git rev-parse` must match its first 12 characters. Equality would refuse every full SHA.
- A pin that is not 7 or more hex digits is a usage error, before any request.
- On a mismatch: exit 1 with `error: head moved — PR #<id> is at <head>, expected <sha>; nothing was merged`, and send no merge request.
- Without the flag, `bb pr merge` behaves as today.
- **The gap between the read and the merge stays open.** Bitbucket's merge endpoint takes no expected head, so a push that lands between the `GET` and the `POST` is merged. The help text and `skills/working-with-bitbucket-api/SKILL.md` say so. There is no post-merge check: it could only report a merge that already happened.
- Update `pr merge` help text and the `pr merge` section of `SKILL.md`.

### Verification

- **Mock suite:** `tests/pr-merge.test.ts` covers: a matching 12-character pin (merge `POST` sent); a matching 40-character pin whose first 12 characters equal the head (`POST` sent); a mismatch (exit 1, `head moved`, **no `POST` recorded**); a 6-character pin and a non-hex pin (usage error, **no request at all**); no flag (today's behaviour, no `GET` before the `POST`).
- **Live check, read-only, on `quatico/ewz-kus-portal`:** only against PR 3712, which is already MERGED, so Bitbucket refuses any merge even if the check is broken. From the branch's `cli/bb`:
  - `bb pr view 3712 --json | jq -r .source.commit.hash` prints the 12-character head
  - `bb pr merge 3712 --match-head-commit 0000000` exits 1 with `head moved`, and Bitbucket's activity for PR 3712 shows no new event
  - No other PR is merged, and no live merge is attempted anywhere.

### Open Points

- [ ] Once this ships, `plot-host.sh pr-merge --match-head` can pass the pin to `bb` instead of comparing itself. That is a plot-repo change; file it after release.

## Slices

<!-- One `### <name> (Branch: <branch>)` heading per slice. -->

### pr merge head pin (Branch: feature/bb-pr-merge-match-head) → #102

- `feature/bb-pr-merge-match-head` — `--match-head-commit` on `cmd_pr_merge`, with cases in `tests/pr-merge.test.ts` <!-- builds: --match-head-commit on cmd_pr_merge -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Deliverable search: no `--match-head-commit` or head comparison exists in `cli/bb`; `plot-host.sh:4125` holds the rule this plan copies.
- Added to the Active sprint `bb-pr-reads` on 2026-10-23 as a Could Have, by the operator's decision, although plot adds only dispatched work to a running sprint. It does not gate release 3.18.0.
