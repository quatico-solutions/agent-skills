# Agentic workflow maps to plot's five board phases

> `adopt-agentic-workflow` and this repository's AGENTS.md map work to Discovery, Design, Development, Testing and Released, the five phases plot 2.29.0's board shows.

## Status

- **Phase:** Released
- **Type:** feature
- **Issue:** #114
- **Sprint:** agentic-workflow
- **Review:** in-session
- **Impl:** own branches
- **Approved:** 2026-10-28, jwloka, in-session
- **Delivered:** 2026-10-28
- **Released:** 2026-10-28, v3.18.3

## Changelog

- adopt-agentic-workflow: maps the workflow to plot's five board phases (Discovery, Design, Development, Testing, Released), with the plan state behind each and `/plot-deliver --verify` in Testing.

## Motivation

`skills/adopt-agentic-workflow/SKILL.md` writes a four-phase map (Discovery, Design, Development, Endgame) into a repository's hub doc. Plot 2.29.0's board shows five phases, and the two disagree in two places:

1. **Draft plans.** The board shows a Draft plan in Discovery, with tickets and stories. The skill puts `/plot-idea` and `challenge-the-plan` under Design. In plot, Design is an optional plan state for a plan that needs design work or a spike before approval.
2. **Testing.** The board shows a Delivered plan in Testing, where `/plot-deliver --verify` judges each claim and writes a `Verified:` record. The skill's Endgame names only `reality-check` and the release, and `bb-paginate-backoff` shipped in 3.18.1 with no `Verified:` record.

AGENTS.md § Agentic Workflow (commit `e7e87a9`) copies the skill's map, so this repository's hub has the same two gaps.

## Design

### Approach

- **Skill template (step 3).** Replace the four-row table with five rows, one per board phase, each with the plan state behind it:

  | Phase | Plan state | Commands and skills |
  |---|---|---|
  | Discovery | Draft | `triage-ticket` · `story-tracking` · `/plot-idea` → `challenge-the-plan` |
  | Design (optional) | Design | needs-design or spike work before approval → `/plot-approve` |
  | Development | Approved | `/plot-implement` · `test-driven-development` · `commit-notation` · `handling-pull-requests` → `/plot-deliver` |
  | Testing | Delivered | `/plot-deliver --verify` · `reality-check` |
  | Released | Released | `/plot-release`, then the project's release process |

  The Released row keeps the template's RC path (`/plot-release rc` → checklist → `/plot-release`) as one option, since other repositories cut RCs.
- **Skill phase names elsewhere.** Change the four-phase wording in the frontmatter `description`, the H1 title, the intro, step 3's lead sentence and the "Discovery is optional" line. Keep the trigger words `agentic workflow` and `four-phase workflow` in the description, so existing prompts still trigger the skill, and add `five-phase workflow`.
- **AGENTS.md § Agentic Workflow.** Apply the same five rows, adapted to this repository: Released names the changesets release PR from `docs/rules/versioning.md`, and no RC path.
- **Changeset.** `adopt-agentic-workflow: patch`, root bump patch, so the change ships in the sprint's release 3.18.2.

### Open Points

- [x] Bump level: patch, decided by the operator on 2026-10-28 to keep the sprint's release 3.18.2, although the plan's Type is `feature`.

## Slices

### five-phase map (Branch: feature/workflow-five-phases, PR: #115)

- `feature/workflow-five-phases` — five-phase map in the adopt-agentic-workflow template and AGENTS.md <!-- builds: five-phase Agentic Workflow map in adopt-agentic-workflow step 3 -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Design question: no. The change follows plot's documented phases and needs no spec.
- Reference: plot 2.29.0 `skills/plot/SKILL.md` § Phases, `docs/board-domain-model.md`, `docs/plot-in-the-pipeline.md`.
- Impl changed from `same branch` to `own branches` on 2026-10-28: the plan lands on main so the board can approve it and the fleet can cut the branch (plot-pm/plot#2528 blocks in-session approval of a same-branch plan).
