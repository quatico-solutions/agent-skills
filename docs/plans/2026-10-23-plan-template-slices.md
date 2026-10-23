# The plan template writes `## Slices` with one heading per slice

> Plot 2.28 refuses to approve a plan whose branch sits under no `### <name> (Branch: <branch>)` heading; the repo template still wrote `## Branches`.

## Status

- **Phase:** Approved
- **Type:** infra
- **Approved:** 2026-10-23, jwloka, in-session
- **Sprint:** <!-- optional, filled when plan is added to a sprint — a time-boxed selection of planned work -->
- **Review:** in-session
- **Impl:** own branches

## Changelog

- The repo plan template (`.plot/templates/plan.md`) writes `## Slices` with one `### <slice name> (Branch: <branch>)` heading per slice, so `/plot-approve` accepts a plan made from it.

## Motivation

On 2026-10-23, `/plot-approve` refused both bb plans: `plan 'bb-pr-view-json-fields' names a branch under no slice heading`. Both plans came from `.plot/templates/plan.md`, which still wrote the pre-2.28 `## Branches` section with `### Tracer` / `### Implementation` wave headings. Every new plan in this repo hits the same refusal until the template changes.

## Design

### Approach

- Rename `## Branches` to `## Slices`.
- One `### <slice name> (Branch: feature/<slug>)` heading per slice. The name is the slice's title on the board and its PR title.
- Order slices with a `waits: <branch>` annotation on the heading line, as plot's own plans do, instead of wave headings. A tracer bullet becomes the first slice, and the others wait on its branch.
- The guidance stays inside one HTML comment. The `waits:` example is written in words, because a literal `-->` inside the comment would close it early.

### Open Points

- [x] Does plot read a plan made from the template? `plot-plan-meta.sh` reports `waves[0].name = "Template check"` with no unread headings.

## Slices

### Template writes Slices (Branch: infra/plan-template-slices) → commit 5799dfb

- `infra/plan-template-slices` — rewrite the `## Branches` section of `.plot/templates/plan.md`

## Definition of Done

- [x] `pnpm test` passes — skills parse (no skill changed)
- [x] `pnpm run validate` passes — skill frontmatter valid (no skill changed)
- [x] `bb` suite green on Linux **and** macOS/bash 3.2 — not applicable, `cli/bb` unchanged
- [x] Changeset added with a `bumps:` block — not applicable, no skill changed
- [x] `README.md` skills table matches `skills/` — not applicable, membership unchanged

## Notes

- Plans delivered before 2026-10-23 keep `## Branches`; plot does not re-read their slices.
