# AGENTS.md

Agent instructions for the `agent-skills` repository: a single plugin, `quatico-skills`, over a flat pool of 19 skills in `skills/`. This file is the hub; the rules that need detail live in the `docs/rules/` spokes listed under [Where to Find More](#where-to-find-more). `CLAUDE.md` imports this file with `@AGENTS.md`, so every agent reads the same rules.

## Critical Rules

1. **NEVER edit version numbers by hand.** The release pipeline owns `metadata.version` in every `SKILL.md`, `version` in `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json`, both `marketplace.json` files, and `package.json`. Hand-edits cause conflicts and drift.
2. **Every change that touches a skill MUST add a changeset.** Run `pnpm changeset` and fill in the summary, the root bump, and the `bumps:` block. Indent `tuned-against:` by exactly two spaces, or CI fails — see `docs/rules/versioning.md`.
3. **Shell scripts MUST stay bash 3.2-compatible.** macOS ships bash 3.2 and always will (bash 4 went GPLv3): no `declare -A`, no `${var^^}`/`${var,,}`, no `mapfile`. Under `set -u`, expand possibly-empty arrays as `${arr[@]+"${arr[@]}"}`. The `bb-tests-macos` CI job pins `/bin/bash` for `cli/bb`; every other script relies on this rule alone.
4. **NEVER use YAML block scalars in SKILL.md frontmatter.** No `>-`, `>`, `|-`, `|` — Cursor does not parse them. `description` is a single-line `"quoted string"`; `metadata.version` is 3-part semver.
5. **Update README.md whenever skill membership changes.** The skills table matches the contents of `skills/`, one row per skill, in alphabetical order by skill name. Add a new skill's row at its place in that order, not at the end. Nothing checks this.
6. **Prefer gates over rules.** A rule is prose an agent can rationalise around; a gate is a hard stop with objective verification (a hook, a CI check). Every rule on this page is currently prose — see `docs/rules/skill-development.md` § Gates Over Rules.

## Essential Commands

```bash
pnpm changeset                                     # scaffold a changeset for a skill change
pnpm test                                          # skills parse
pnpm run validate                                  # skill frontmatter valid
(cd skills/working-with-bitbucket-api/tests && pnpm test)   # bb integration suite
```

`pnpm run version` belongs to the release pipeline; do not run it in a change.

## Definition of Done

A change is done when all three pass:

1. `pnpm test` — skills parse (CI: `ci.yml`, every PR)
2. `pnpm run validate` — skill frontmatter valid (CI: `ci.yml`, every PR)
3. `pnpm test` in `skills/working-with-bitbucket-api/tests/` — the `bb` integration suite on Linux **and** macOS/bash 3.2 (CI: `bb-tests.yml`, only when the diff touches `cli/bb`)

Plus a changeset for any skill-touching change, per Critical Rule 2. `ci.yml` only warns when the changeset is missing.

## Where to Find More

| When working on | Read |
|---|---|
| Changesets, bump levels, model class, the release flow | `docs/rules/versioning.md`, [CONTRIBUTING.md](CONTRIBUTING.md) |
| Repository layout, adding or removing a skill, frontmatter, gates | `docs/rules/skill-development.md` |
| Plans, branch prefixes, commit style | [Plot Config](#plot-config) below |

## Plot Config

- **Branch prefixes:** idea/, feature/, bug/, docs/, infra/
- **Plan directory:** docs/plans/
- **Active index:** docs/plans/active/
- **Delivered index:** docs/plans/delivered/
- **Sprint directory:** docs/sprints/
- **People:** jwloka = Jan Wloka
- **CI:** github-actions
- **Worktree root:** .worktrees
- **Board port:** 7778
- **Git host:** github
- **Tracker:** plot
- **Commit style:** arlo-colon
- **Plan template:** .plot/templates/plan.md
- **Worker command:** PLOT_UNATTENDED=1 PLOT_MODEL=sonnet ~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-worker-loop.sh

`Worker command` starts plot's worker loop in each desk `/plot-dispatch` prepares. The loop runs one unattended `claude` session (Sonnet) per claimed slice, with that slice's brief. The path points at the marketplace checkout, which plugin updates change in place, so the command survives a plot upgrade. The fleet supervisor for this repo runs under the launchd label `com.plot-pm.fleetd.agent-skills`; pass `PLOT_FLEET_LABEL` with that value to `/plot-fleet --status` and `--stop`.

Plot was in use here before it was configured, so every key above records a path this repo already uses. Commit style is `arlo-colon`: a risk letter, a colon and the subject (`F: …`, `B: …`, `D: …`, `E: …`, `t: …` per [commit-notation](skills/commit-notation/SKILL.md)). Plot records go as `plot: …`. Older commits, up to release 3.18.0, use the dash form `F - …`; write new commits with the colon.
