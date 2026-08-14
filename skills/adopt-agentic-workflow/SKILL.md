---
name: adopt-agentic-workflow
description: "Use when adopting the four-phase agentic workflow (Discovery → Design → Development → Endgame) in a repository: installs Plot for the plan lifecycle, then wires this org's skills to the phases they serve. Triggers: adopt workflow, agentic workflow, install plot, set up plot, bootstrap workflow, four-phase workflow, plot adoption."
license: MIT
compatibility: claude-code, cursor
metadata:
  version: "1.0.0"
---

# Adopt the Four-Phase Agentic Workflow

Set up Discovery → Design → Development → Endgame in a repository: the plan
lifecycle, plus the skills that serve each phase.

## What this does, and what it delegates

**Plot owns the plan lifecycle.** It is project-agnostic by design, so it knows
nothing about this organisation's tooling. Its `/plot-init` probes the repo and
sets up plans, branches, and config — this skill does not reimplement any of
that.

**This skill owns the connective layer**: which of our skills serves which
phase, where our Definition of Done lives, and how session logs get written.
That mapping is the thing a newcomer (human or agent) cannot infer, and it is
what turns a set of installed skills into a workflow.

**The dependency runs one way.** This skill knows Plot; Plot must never know
this skill. If Plot changes, adjust here — not there.

## Prerequisites

Plot must be available (plugin, `pnpm dlx skills add`, or a symlink into
`~/.claude/skills/`). If `/plot-init` is not available, say so plainly and
stop: the phases below are all anchored to plan states, so there is nothing
useful to install without it.

## Steps

### 1. Run Plot's own adoption

```
/plot-init
```

It probes the repo (git host, quality-gate scripts, ticket scheme, commit
notation, existing planning systems) and proposes a `## Plot Config`. Let it
run to completion and let the user confirm its proposals — **do not answer on
their behalf**, especially the Definition of Done: `/plot-init` finds
candidate scripts, but only a human knows which gate a merge.

If `/plot-init` reports that a Plot Config already exists, skip to step 2. This
skill is additive over an existing Plot setup.

### 2. Write the phase-to-skill map into the hub

This is the core of this skill. Append to the hub doc (`CLAUDE.md` or
`AGENTS.md` — whichever `/plot-init` used), adapted to what the repo actually
has. **Only list skills that exist here**; a map pointing at absent tools is
worse than no map.

```markdown
## Agentic Workflow

Four phases, each turning one durable artifact into the next.

| Phase | Produces | Commands and skills |
|-------|----------|---------------------|
| **Discovery** | a story (`docs/stories/`) or a ticket assessment | `triage-ticket` for an incoming ticket · `story-tracking` for multi-session work |
| **Design** | an approved plan (`docs/plans/`) | `/plot-idea` → `challenge-the-plan` → `/plot-approve` |
| **Development** | merged branches | `/plot-implement` · `test-driven-development` · `commit-notation` · `handling-pull-requests` → `/plot-deliver` |
| **Endgame** | a verified release | `reality-check` before claiming done · `/plot-release rc` → verify the checklist → `/plot-release` |

Discovery is optional: small, well-understood work goes straight to Design.

**Plans vs. session logs.** A plan says what will be built and is frozen on
approval. A session log says how it was decided — including the alternatives
that were rejected — stays amendable, and outlives the plan. If it must be
true *before* building starts, it belongs in the plan; if it answers "why not
the other way?", it belongs in a log.
```

Append only. Preserve every existing rule verbatim; this repo's hub may carry
conventions that predate any of this.

### 3. Wire the session-log seam

If this repo keeps session logs (`docs/sessionlogs/` or similar) and `bye` is
in use, add the section `bye` looks for:

```markdown
## Session Wrap Up

Include the Plot context for this session in the log:

    skills/plot/scripts/plot-context.sh

It reports the governing plan, its phase, its wave, and its PRs as JSON. An
empty `plan_slug` means the branch belongs to no plan — say that rather than
guessing, because a log attributed to the wrong plan outlives the session that
mis-attributed it.

Record decisions and their **rejected alternatives** here, not in the plan.
```

`bye` writes the log; Plot only supplies the facts. Do not build a second
log-writer.

### 4. Record the Definition of Done

`/plot-init` proposes candidate scripts; this step states the DoD as a rule the
repo can be held to. Put it in the hub, in this repo's own terms:

- Which commands must pass before a PR is ready
- Which changes need tests, and of what kind (unit? BDD scenarios?)
- Which changes need documentation
- Whether a changeset is required
- Language and spelling rules for user-facing text (for German repos:
  `schweizer-schreibweise`, no `ß`)

Ask; do not infer. A DoD nobody agreed to is a DoD nobody follows.

### 5. Point at host and commit conventions — do not restate them

Where the repo is on Bitbucket, note that `working-with-bitbucket-api` covers
PR operations and that `gh` is not available. Where commit conventions exist,
point at `commit-notation`.

**Reference, never duplicate.** A copied command table in a hub doc goes stale
the day the tool changes, and then two sources disagree. Plot's own
`plot-host.sh` already abstracts the host CLI, so skills never need the
translation themselves — the note is for agents that reach for `gh` out of
habit.

### 6. Offer a dry run

The lifecycle is best learnt by walking it once, and this adoption is a
convenient subject:

> Want to walk this adoption through the lifecycle as its own plan?
> `/plot-idea` → `challenge-the-plan` → `/plot-approve` → the changes above →
> `/plot-deliver`.

**Caveat:** if Plot was installed as a plugin this session, its slash commands
activate only in a *new* session. Say so rather than letting the user hit it.

### 7. Summarise, including what you deferred

State what was installed, what the user must still do (DoD confirmation,
plugin activation, anything unwritable), and what the next action is. **List
deferrals explicitly** — an adoption that silently skipped a step is worse
than one that reports it.

## Guardrails

- **Additive only.** Never move, rewrite, or delete existing content. A repo
  with several planning systems keeps them all; describe the boundary and let
  the humans decide what is canonical.
- **Never fail the whole adoption on one blocked step.** The steps are largely
  independent. If a file cannot be written, print exactly what to add and
  where, then continue.
- **Never invent the Definition of Done.** Ask.
- **Never reimplement Plot.** If setup logic seems missing, it belongs in
  `/plot-init`, upstream.
- **Never copy a command table.** Point at the skill that owns it.

## Common Mistakes

| Mistake | Effect | Prevention |
|---------|--------|------------|
| Mapping phases to skills the repo does not have | The map reads as authoritative and sends people to nothing | List only what is installed here |
| Duplicating the `bb`/`gh` table into the hub | Two sources of truth; the copy goes stale first | Reference `working-with-bitbucket-api` |
| Building a second session-log writer | Two logs, neither complete | `bye` writes; `plot-context.sh` supplies |
| Answering the Definition of Done for the user | A DoD nobody agreed to is not followed | Ask, always |
| Re-running over an existing Plot setup | Duplicate config sections | Check `/plot-init`'s report first; this skill is additive |
| Promising slash commands work immediately after a plugin install | They activate next session; the user hits a wall | Say so in the summary |
