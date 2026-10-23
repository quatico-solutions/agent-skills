# Sprint: bb PR reads

> `bb pr view` and `bb pr list` return what exists: no 404 for an existing PR, no silent cut at 50 rows.

## Status

- **State:** Active
- **Start:** 2026-10-26
- **End:** 2026-10-30
- **Release:** 3.18.0

## Sprint Goal

Two open issues, both filed 2026-10-23, make `bb` report a wrong answer as if it were the right one: #97 turns a field list into a 404, and #98 truncates every listing at 50 rows without a warning. Both cost investigation time in client repos and block plot's append-only PR index (plot-pm/plot#2385). The sprint fixes both and ships them as 3.18.0.

### Must Have

<!-- An item is `- [ ] <description>`. A leading `[<plan-slug>]` names the plan
     it commits to, and only a plan slug is read as one: `- [ ] [#123](url) …`
     names an issue, so it is an item with no plan and is scored on its
     checkbox. Strike a reference — `~~[<plan-slug>]~~` — to mark an item that
     left the sprint; the plan's own state then says whether it was withdrawn. -->

- [ ] [bb-pr-view-json-fields] `bb pr view --json <fields>` and `--jq` instead of HTTP 404 (#97) <!-- pr: #101, branch: bug/bb-pr-view-json-fields -->
- [ ] [bb-pr-list-pagination] `bb pr list` pagination, `--all`, 429 retry, truncation warning, `--updated-since` (#98) <!-- pr: #0, branch: feature/bb-pr-list-pagination -->

### Should Have

<!-- add items here -->

### Could Have

<!-- add items here -->

- [ ] [bb-pr-merge-match-head] `bb pr merge --match-head-commit <sha>` refuses a merge when the PR moved (#100)

### Deferred

<!-- Items moved here during sprint when they won't make the timebox -->

## Retrospective

<!-- Filled during /plot-sprint close: What went well / What could improve / Action items -->

## Notes

### Scope Changes

<!-- Log scope changes here: added/removed items, tier changes, with date and reason -->
<!-- Format: - YYYY-MM-DD: Added/Moved/Removed [slug] reason -->

- 2026-10-23: Added [bb-pr-merge-match-head] to Could — issue #100 filed during the sprint; added by the operator's decision although the plan is not yet dispatched. A Could Have does not gate release 3.18.0.

### Planning
- plot-host's own handling of `--limit` for Bitbucket lives in the plot repo and is out of scope; see the open point in `bb-pr-list-pagination`.
