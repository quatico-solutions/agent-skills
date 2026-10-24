# bb PR reads: sprint, fleet run and release 3.18.0

**Date:** 2026-10-24 (work done 2026-10-23)
**Source:** Claude Code

## Summary

Planned, implemented and released three `bb` issues (#97, #98, #100) as sprint `bb-pr-reads`, shipped in agent-skills 3.18.0 (bb 1.12.0). The implementation ran on plot's fleet for the first time in this repository, which needed several repairs to plot's adoption here; those repairs and the gaps behind them are the main content of this log.

## Key Accomplishments

- Sprint `bb-pr-reads` (`docs/sprints/2026-W43-bb-pr-reads.md`): created, committed, started and closed on 2026-10-23 with Must Have 2/2 and Could Have 1/1, release 3.18.0 cut, retrospective written.
- Three plans written, challenged in two rounds, approved in-session and briefed for fleet agents: `bb-pr-view-json-fields` (#97, PR #101), `bb-pr-list-pagination` (#98, PR #103), `bb-pr-merge-match-head` (#100, PR #102). All three are recorded as Released v3.18.0.
- Release PR #104 merged pinned to its reviewed head; tag and GitHub release `v3.18.0` published 2026-10-23 18:09 UTC.
- Filed plot-pm/plot#2400: plot-host's Bitbucket listing reads one page of 50 per state and should switch to `bb pr list --all`.
- Plot adoption repaired: plan template writes `## Slices`; Plot Config gained `People`, `Sprint directory`, `CI`, `Worktree root`, `Board port`, and a real `Worker command`; `.plot/worker-prompt.sh` installed; `.plot/logs/` ignored.
- `dedicated-browser` plan corrected from the unrecognised `Phase: In Progress` to Released v3.15.0 (PR #76).
- Reconcile sweep ends with every count at 0; six fleet desks moved to the Trash; 327 stale plot temp entries swept.
- Local `~/.local/bin/bb` launcher fixed to find `cli/bb` (it ran bb 1.0.0 from the 2.1.0 plugin cache); caches 2.1.0 and 3.13.1 moved to the Trash.

## Changes Made

- Created: `docs/plans/2026-10-23-bb-pr-view-json-fields.md`, `docs/plans/2026-10-23-bb-pr-list-pagination.md`, `docs/plans/2026-10-23-bb-pr-merge-match-head.md`, `docs/plans/2026-10-23-plan-template-slices.md`, `docs/sprints/2026-W43-bb-pr-reads.md`, `.plot/briefs/bb-pr-view-json-fields.md`, `.plot/briefs/bb-pr-list-pagination.md`, `.plot/briefs/bb-pr-merge-match-head.md`, `.plot/worker-prompt.sh`
- Modified: `AGENTS.md` (Plot Config), `.plot/templates/plan.md`, `.gitignore`, `docs/plans/2026-09-26-dedicated-browser.md`
- Outside the repository: `~/.local/bin/bb` (added the `cli/bb` search path); `~/Library/LaunchAgents/com.plot-pm.fleetd.agent-skills.plist` (fleet unit, installed, currently not loaded)

## Decisions

- **#98 serves direct `bb` callers, not plot.** `plot-host.sh` never calls `bb pr list`; it calls `bb api …&pagelen=50` once per state. The plot-side switch went to plot-pm/plot#2400.
- **`pagelen` belongs to `cmd_pr_list`, not `bb_paginate`.** `bb_paginate` has 14 callers whose endpoints allow different page sizes. The 429 retry stays in `bb_paginate`, so every listing gets it.
- **`--sort` dropped from #98.** Bitbucket already returns PRs newest-updated first, and `--updated-since` (inclusive `>=`, as in plot-host) filters on the server.
- **`--match-head-commit` copies plot's matching rule:** two-way prefix, both values 7 or more hex digits, lowercased (`plot-host.sh:4125`). Bitbucket returns a 12-character head hash, so equality would refuse every full SHA. The read–merge race is documented, with no post-merge check.
- **#100 added to the running sprint as a Could Have** by the operator's decision, although plot adds only dispatched work mid-sprint; logged under Scope Changes.
- **Worker command is plot's worker loop**, not bare `claude`: `PLOT_UNATTENDED=1 PLOT_MODEL=sonnet ~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-worker-loop.sh`. Agents run with `bypassPermissions`, chosen by the operator.
- **Live checks run read-only against `quatico/ewz-kus-portal`**; the merge check runs only against the already-merged PR 3712, so a broken build cannot merge a real PR.
- **#103 merged with its `--all` live check failing on HTTP 429.** The operator merged it; the retry window is an open action item.

## Plot gaps found (not yet filed)

- `/plot-approve` refused plans without `### <name> (Branch: …)` headings; the repo template still wrote `## Branches`.
- In the heading form, plot reads a commit arrow (`→ commit abc1234`) on the heading line, and a PR only inside the parentheses (`(Branch: …, PR: #N)`); an arrow after the heading is not read as a PR. The plot skill documents the arrow on the branch line.
- `/plot-approve` adds a `<!-- pr: … -->` annotation to a scope-change log line that names the slug, not only to the sprint item.
- The controller gate blocks read-only commands such as `grep` when they name a gated script.
- The board's `/api/deliver` refuses without an `Idea command` key, while the gate sends delivery to the board, so a board-less delivery needs a receipt.
- A repository with no `.plot/worker-prompt.sh` makes every fleet worker exit 1 at start; the claim then stays with no agent and needs `--restart`.
- The `plan:*` issue labels do not exist here, so every plan-state write to an issue fails with `'plan:draft' not found`.

## Next Steps

- [ ] Decide the `--all` retry window for `bb_paginate` (more attempts, longer backoff, or a documented limit) and reopen the unexplained 50-row cap in `bb-pr-list-pagination`.
- [ ] Create the `plan:*` labels in this repository.
- [ ] Add the `cli/bb` path to machine-setup's copy of the `~/.local/bin/bb` launcher; the local fix is overwritten on the next run.
- [ ] File the plot gaps above as plot-pm/plot issues.
- [ ] Find out why workflow runs on `changeset-release/main` end `action_required` and need a manual approval.
- [ ] After a plot upgrade, re-fill the fleet unit (`/plot-fleet --stop`, then `--start` with `PLOT_FLEET_LABEL=com.plot-pm.fleetd.agent-skills`); it points at the `plot/2.28.0` cache directory.

## Repository State

- Committed: `ead6148` - plot: ignore .plot/logs/, the board and fleet logs
- Branch: `main`, in sync with `origin/main`; CI, bb CLI tests and Release green on `ead6148`
- Released: `v3.18.0` (bb 1.12.0)
