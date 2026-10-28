# Implementation brief — workflow-five-phases

- **Plan (canonical):** `docs/plans/2026-10-28-workflow-five-phases.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `feature/workflow-five-phases` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`. Do not merge it yourself.
- **Review of the code:** normal PR review; CI runs `ci.yml` (`pnpm test`, `pnpm run validate`, changeset check)
- **Sprint:** `agentic-workflow` (2026-10-28 to 2026-10-30), Must Have — it gates release 3.18.2

One slice, one wave. Nothing waits on it. Issue #114.

## What to build

`skills/adopt-agentic-workflow/SKILL.md` writes a four-phase map (Discovery, Design, Development, Endgame) into a repository's hub doc. Plot 2.29.0's board shows five phases: Discovery, Design, Development, Testing, Released. Change the skill and this repository's `AGENTS.md` § Agentic Workflow to the five phases. The plan is canonical; this brief is orientation.

1. **Skill, step 3 template.** Replace the four-row table with five rows, each naming its plan state:

   | Phase | Plan state | Commands and skills |
   |---|---|---|
   | **Discovery** | Draft | `triage-ticket` · `story-tracking` · `/plot-idea` → `challenge-the-plan` |
   | **Design** (optional) | Design | needs-design or spike work before approval → `/plot-approve` |
   | **Development** | Approved | `/plot-implement` · `test-driven-development` · `commit-notation` · `handling-pull-requests` → `/plot-deliver` |
   | **Testing** | Delivered | `/plot-deliver --verify` · `reality-check` |
   | **Released** | Released | `/plot-release rc` → verify the checklist → `/plot-release`, or the project's own release process |

   Keep the template's column "Produces" if it still reads naturally, or replace it with "Plan state"; the plan state per row is required.
2. **Skill, phase wording elsewhere.** Frontmatter `description`, the H1 title, the intro under it, step 3's lead sentence ("Four phases, …"), and the "Discovery is optional: small, well-understood work goes straight to Design." line. Reword the last one for five phases: small work skips Design and goes from a Draft plan to approval.
3. **AGENTS.md § Agentic Workflow.** The same five rows, adapted to this repository: Released reads `/plot-release`, then merge the changesets release PR (no RC path). Keep the paragraph after the table that points at `docs/rules/versioning.md`, and the "Plans and session logs" paragraph, unchanged.
4. **Changeset** (`pnpm changeset`, or write `.changeset/<date>-workflow-five-phases.md` by hand following an existing one in git history): root `patch`, `bumps:` → `adopt-agentic-workflow: patch`.

## Decisions the plan settles — do not re-derive them

**Patch, not minor.** The plan's Type is `feature`, but the operator chose a patch bump so the change ships in the sprint's release 3.18.2.

**Keep the old trigger words.** The `description` is how the skill is found. Keep `agentic workflow` and `four-phase workflow` in its trigger list so existing prompts still match, and add `five-phase workflow`.

**Name plot's states, do not invent phases.** Discovery holds Draft plans together with tickets and stories; Design is optional and is a plan state of its own; Testing is the Delivered state; `/plot-deliver --verify` is plot's verification step. Sources: plot 2.29.0 `skills/plot/SKILL.md` § Phases and `docs/board-domain-model.md` (property `phase`).

**Rules this repo keeps re-learning:**
- SKILL.md frontmatter: `description` stays one line in double quotes; no YAML block scalars (AGENTS.md Critical Rule 4).
- **Never edit `metadata.version`** or any other version number (Critical Rule 1).
- Never hard-wrap prose added to markdown tables or paragraphs you rewrite in AGENTS.md; one paragraph is one line there. The skill file is hard-wrapped already — match the surrounding style in each file.

## Done when

- The skill's step 3 template shows five phases with a plan state for each, and no other place in the skill says "four-phase" except the kept trigger word.
- `AGENTS.md` § Agentic Workflow matches the template, adapted as in item 3.
- `pnpm test` and `pnpm run validate` pass. Run both before each push.
- The changeset exists with the `bumps:` block.

## Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-open-pr.sh` (`--draft` while the work moves). Do not run `gh pr create`.
- When the PR exists, record it in the plan's slice heading inside the parentheses: `### five-phase map (Branch: feature/workflow-five-phases, PR: #<number>)`. An arrow after the heading is not read.
- Commit style is `arlo-colon` (`F: …`, `D: …`), per `skills/commit-notation/SKILL.md`.

## Scope guard

This branch owns `skills/adopt-agentic-workflow/SKILL.md`, `AGENTS.md` § Agentic Workflow, the plan's slice heading, and one changeset. Change nothing else in `AGENTS.md`. No other branch is in flight.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
