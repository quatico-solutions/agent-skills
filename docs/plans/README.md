# Plans

Plot plans live here: `YYYY-MM-DD-<slug>.md`, never moved once created.
`active/` and `delivered/` hold symlinks to them — the symlink's location and
the plan's `Phase:` field must agree, and `/plot-reconcile` reports it when
they don't.

Start with `/plot` to see where things stand, `/plot-idea <slug>: <title>` to
write a plan.

## What is canonical

Plot is canonical for **planned, multi-step work** — anything that needs
review before implementation, or spans more than one branch.

Small changes do not need a plan. A rename, a typo, a one-line fix goes
straight to a `feature/`, `bug/`, `docs/` or `infra/` branch and a PR.
Ceremony scales with weight.

## Neighbouring systems

These predate the Plot config and are **not** superseded by it. Nothing was
migrated; each still owns what it always did.

| Location | Owns | Relationship to Plot |
|---|---|---|
| `docs/sessionlogs/` | Per-session narrative: what happened, what was decided, what was rejected | Complements plans. A plan is frozen at approval and says what will be built; a log stays amendable and says why it was built that way. |
| `.omc/` | oh-my-claudecode agent state, notepad, project memory | Unrelated tooling, gitignored. Not a planning system despite the `plans/` subdirectory it may create. |
| `.changeset/` | Release notes and version bumps | Downstream of a plan. A plan's `## Changelog` is drafted at planning time; the changeset is the artifact that ships it. |

## Where decisions belong

In the **session log**, not the plan — including the alternatives that were
rejected and why. A plan is frozen on approval; a log outlives it and stays
correctable.
