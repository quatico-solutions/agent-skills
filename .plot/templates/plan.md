# <title>

> <one-line summary>

## Status

- **Phase:** Draft
- **Type:** feature | bug | docs | infra
- **Story:** <!-- optional, story slug (docs/stories/<slug>/) — the durable intent this plan serves -->
- **Sprint:** <!-- optional, filled when plan is added to a sprint — a time-boxed selection of planned work -->
- **Review:** <!-- pr | in-session | ballot — how is this plan reviewed & approved? -->
- **Impl:** <!-- own branches | same branch | other repo | none — where does implementation happen? -->
<!-- Transition records — written by the workflow commands, not by hand:
- **Approved:** <date>, <who>, <channel>
- **Started:** <date>, <who>, <branch>   (one line per started branch)
-->

## Changelog

<!-- Release note entry. Written during planning, refined during implementation. -->

- <user-facing change description>

## Motivation

<!-- Why does this matter? What problem does it solve? -->

## Design

### Approach

<!-- How will this be implemented? Key architectural decisions. -->

### Open Points

- [ ] ...

## Slices

<!-- One `### <name> (Branch: <branch>)` heading per slice. The name is the
     slice's title on the board and its PR title. /plot-approve refuses a branch
     that sits under no such heading. Record the slice's PR inside the same
     parentheses, `(Branch: <branch>, PR: #N)`; an arrow after the heading is
     not read as a PR.
     Order slices with a `waits: <branch>` HTML comment on the heading line: the slice
     becomes eligible once that branch is merged. Slices with no `waits:` are
     eligible at once.
     Optional: a tracer bullet (thin vertical slice) first — see the
     tracer-bullets skill — with the other slices waiting on its branch.
     Annotations (builds:/waits:/deferred:/claimed:/moved:) must sit on the SAME
     line they annotate — a wrapped continuation line is not read. -->

### <slice name> (Branch: feature/<slug>)

- `feature/<slug>` — <description>

## Definition of Done

<!-- Per ## Plot Config in AGENTS.md. Check before marking any impl PR ready. -->

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

<!-- Session log, decisions, links -->
