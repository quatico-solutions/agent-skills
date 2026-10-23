# Sprint: bb PR reads

> `bb pr view` and `bb pr list` return what exists: no 404 for an existing PR, no silent cut at 50 rows.

## Status

- **State:** Closed
- **Actual End:** 2026-10-23
- **Start:** 2026-10-23
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

- [x] [bb-pr-view-json-fields] `bb pr view --json <fields>` and `--jq` instead of HTTP 404 (#97) <!-- pr: #101, branch: bug/bb-pr-view-json-fields -->
- [x] [bb-pr-list-pagination] `bb pr list` pagination, `--all`, 429 retry, truncation warning, `--updated-since` (#98) <!-- pr: #0, branch: feature/bb-pr-list-pagination -->

### Should Have

<!-- add items here -->

### Could Have

<!-- add items here -->

- [x] [bb-pr-merge-match-head] `bb pr merge --match-head-commit <sha>` refuses a merge when the PR moved (#100) <!-- pr: #0, branch: feature/bb-pr-merge-match-head -->

### Deferred

<!-- Items moved here during sprint when they won't make the timebox -->

## Retrospective

### What went well

- All three issues (#97, #98, #100) went from issue to released code on 2026-10-23, in 3.18.0 (bb 1.12.0), through plans, briefs and fleet agents.
- The live checks on `quatico/ewz-kus-portal` found a defect the mock suite missed: `bb_paginate` failed with `jq: Argument list too long` at `--limit 120`. #103 fixed it with a temp-file accumulator.
- `/challenge-the-plan` found before implementation that `plot-host.sh` does not call `bb pr list`, which moved the plot-side change to plot-pm/plot#2400 instead of into this sprint.

### What could improve

- The fleet's first two runs never started an agent: this repo had no `.plot/worker-prompt.sh`, so each `claude` start exited 1. Recovery needed a force-push, two claim restarts and moving a desk to the new `main`.
- Plot's controller gate blocked approvals, deliveries and releases until a board ran for this repo, and it also blocked read-only `grep` commands that named a gated script.
- `--all` on ewz-kus-portal (3519 merged PRs) still fails with HTTP 429 after three retries (1 s, 2 s, 4 s). PR #103 merged without that live check passing.
- The 50-row cap in #98 is not explained: the old loop should have stopped at 100 rows. The plan's open point is ticked although the cap was never reproduced.
- Each workflow run on the release branch waited for a manual approval (`action_required`) before #104 could merge.

### Action items

- [ ] Decide the `--all` retry window (more attempts, longer backoff, or a documented limit) and reopen the 50-row cap question in `bb-pr-list-pagination`.
- [ ] Create the `plan:*` labels in this repository, so plot's issue-state writes stop failing (`'plan:draft' not found`).
- [ ] Add the `cli/bb` path to machine-setup's copy of the `~/.local/bin/bb` launcher; the local fix is overwritten on the next run.
- [ ] File plot issues: the `→ commit` arrow is read only on the slice heading line; `/plot-approve` annotates scope-change log lines that name a slug; the controller gate blocks read-only commands.
- [ ] Find out why release-branch workflow runs need approval, and remove that step if it is not intended.

### Metrics

- **Must-haves completed:** 2/2
- **Should-haves completed:** 0/0
- **Could-haves completed:** 1/1
- **Deferred items:** 0
- **Scope changes during sprint:** 1
- **Duration:** planned 5 days (2026-10-26 to 2026-10-30), actual 1 day (2026-10-23)

## Notes

### Scope Changes

<!-- Log scope changes here: added/removed items, tier changes, with date and reason -->
<!-- Format: - YYYY-MM-DD: Added/Moved/Removed [slug] reason -->

- 2026-10-23: Added [bb-pr-merge-match-head] to Could — issue #100 filed during the sprint; added by the operator's decision although the plan is not yet dispatched. A Could Have does not gate release 3.18.0. <!-- pr: #0, branch: feature/bb-pr-merge-match-head -->

### Planning
- plot-host's own handling of `--limit` for Bitbucket lives in the plot repo and is out of scope; see the open point in `bb-pr-list-pagination`.
