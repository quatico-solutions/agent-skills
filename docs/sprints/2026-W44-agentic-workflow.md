# Sprint: agentic workflow

> The adoption skill and AGENTS.md map work to plot's five board phases.

## Status

- **State:** Closed
- **Actual End:** 2026-10-28
- **Start:** 2026-10-28
- **End:** 2026-10-30
- **Release:** 3.18.3

## Sprint Goal

`adopt-agentic-workflow` writes a four-phase map (Discovery, Design, Development, Endgame) into a repository's hub doc, and this repository's AGENTS.md carries a copy. Plot 2.29.0's board shows five phases: Discovery, Design, Development, Testing, Released. The sprint changes the skill template and AGENTS.md to the five phases, so that a Draft plan sits in Discovery and `/plot-deliver --verify` has its place in Testing (#114).

### Must Have

<!-- An item is `- [ ] <description>`. A leading `[<plan-slug>]` names the plan
     it commits to, and only a plan slug is read as one: `- [ ] [#123](url) …`
     names an issue, so it is an item with no plan and is scored on its
     checkbox. Strike a reference — `~~[<plan-slug>]~~` — to mark an item that
     left the sprint; the plan's own state then says whether it was withdrawn. -->

- [x] [workflow-five-phases] adopt-agentic-workflow and AGENTS.md map skills to plot's five board phases (#114) <!-- pr: #115, branch: feature/workflow-five-phases -->

### Should Have

<!-- add items here -->

### Could Have

<!-- add items here -->

### Deferred

<!-- Items moved here during sprint when they won't make the timebox -->

## Retrospective

Drafted from the session record on 2026-10-28; edit freely.

### What went well

- Issue #114 went from filing to release v3.18.3 on one day: plan, approval, fleet implementation (PR #115, CI green), auto-delivery and release.
- The fleet agent built the change from the brief alone; the PR needed no rework.
- The release App opened release PR #116, and its checks ran without a manual approval.

### What could improve

- In-session approval of a same-branch plan failed on the board (plot-pm/plot#2528); the plan moved to main with `Impl: own branches`, and a stale plan branch had to be deleted before the fleet would take the slice.
- The fleet held the slice for a missing brief; `/plot-implement` was skipped and the brief was written by hand.
- The sprint named release 3.18.2 without checking the tags; a teammate had cut 3.18.2 the day before, so the target moved to 3.18.3.
- The plan shipped without `/plot-deliver --verify`, the Testing step this change adds to the workflow.

### Action items

- [ ] Check `git tag` before naming a sprint's `Release:`.
- [ ] Run `/plot-implement` after approval so the brief and the Started record exist before the fleet looks.
- [ ] Run `/plot-deliver --verify` on a delivered plan before merging its release PR.

### Metrics

- **Must-haves completed:** 1/1
- **Should-haves completed:** 0/0
- **Could-haves completed:** 0/0
- **Deferred items:** 0
- **Scope changes during sprint:** 3
- **Duration:** planned 3 days, actual 1 day

## Notes

### Scope Changes

<!-- Log scope changes here: added/removed items, tier changes, with date and reason -->
<!-- Format: - YYYY-MM-DD: Added/Moved/Removed [slug] reason -->

- 2026-10-28: Item #114 now names its plan [workflow-five-phases] (Draft, on `feature/workflow-five-phases`). <!-- pr: #0, branch: feature/workflow-five-phases -->
- 2026-10-28: #111, #112 and #113 (bb follow-ups) left out by the operator's decision; they are bb work, not workflow.
- 2026-10-28: Release target 3.18.2 → 3.18.3. A teammate cut 3.18.2 on 2026-10-27 (PR #110), before this sprint named it; release PR #116 carries this sprint's change as 3.18.3.
