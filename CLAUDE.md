# CLAUDE.md

Agent instructions for the `agent-skills` repository.

## Repository Structure

A single plugin (`quatico-skills`) over a flat skill pool:

```
skills/          ← 16 skills (flat pool, one dir per skill)
.claude-plugin/  ← marketplace.json + plugin.json
.cursor-plugin/  ← marketplace.json + plugin.json
```

Both marketplace manifests define one plugin, `quatico-skills`, with `source: "./"`; skills are discovered from `skills/` (and commands from `commands/`, currently empty — the only command moved to plot-pm/plot with its skill). No symlinks. Layout follows the flat-pool convention of `anthropics/skills`.

## Versioning

**Versioning is changeset-driven — NEVER edit version numbers by hand.** Do not touch `metadata.version` in any `SKILL.md`, the `version` in `.claude-plugin/plugin.json` / `.cursor-plugin/plugin.json`, the `marketplace.json` files, or `package.json`. The release pipeline owns all of them; hand-edits cause conflicts and drift.

Instead, **every change that touches a skill MUST add a changeset**:

```bash
pnpm changeset   # scaffolds a file in .changeset/ from the template
```

Edit the created file — a one-line summary (becomes the `CHANGELOG.md` entry), a root-package bump in the frontmatter, and a `bumps:` block listing each changed skill with its level:

```yaml
---
"@quatico-solutions/agent-skills": minor   # root package / collection bump
---

Brief description of the change

<!--
bumps:
  skills:
    working-with-bitbucket-api: minor
    handling-pull-requests: patch
-->
```

Choose each level by impact (applies to both the root bump and per-skill bumps):

- **Patch** (`x.y.Z`): bug fixes, wording improvements, minor clarifications
- **Minor** (`x.Y.0`): new sections, new patterns, expanded coverage, a new skill
- **Major** (`X.0.0`): structural reorganization, removed sections, breaking workflow changes

### Model class

Skills are prompts, and prompts are model-dependent: a model update can change a skill's behaviour without a line of it changing. Record the model class a change was authored or tuned against as a sibling key in the `bumps:` block:

```yaml
<!--
bumps:
  skills:
    test-driven-development: minor
  tuned-against: claude-opus-5
-->
```

**Indentation matters.** `tuned-against:` must sit at the same two-space indent as `skills:`. `bump-skill-versions.sh` treats any line indented four or more spaces as a skill entry, so a deeper indent would be parsed as a skill name and fail CI's "non-existent skill directory" check.

Use the model family, not a dated snapshot (`claude-opus-5`, not `claude-opus-5-20260724`). Omit it for model-independent changes — a broken link, a corrected CLI flag. When a skill is revised specifically because a new model behaves differently, say so in the summary line too: that is the entry a reader needs when the next model lands.

At release, `pnpm run version` consumes the changesets: `bump-skill-versions.sh` bumps each `SKILL.md` from the `bumps:` blocks, `changeset version` bumps `package.json` and writes `CHANGELOG.md`, and `sync-versions.sh` propagates the version to the plugin manifests and regenerates `marketplace.json`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow.

> CI only *warns* when a skill-touching PR has no changeset (a soft gate) — don't rely on it, add the changeset yourself.

## Skill Development

- Every skill has `SKILL.md` (frontmatter + instructions) and `README.md` (development notes)
- Optional: `REFERENCE.md`, `install-dependencies.sh`, `diagrams/`
- Skills with `install-dependencies.sh` must be macOS + Homebrew, idempotent
- **Shell scripts must stay bash 3.2-compatible.** macOS ships bash 3.2 and always will (bash 4 went GPLv3), so no `declare -A`, no `${var^^}`/`${var,,}`, no `mapfile`; and under `set -u`, expand possibly-empty arrays as `${arr[@]+"${arr[@]}"}`. Gated for `bin/bb` by the `bb-tests-macos` CI job, which pins `/bin/bash`; the other scripts rely on this rule
- When adding a new skill, place it in the top-level `skills/` directory

### Frontmatter Rules

- **Never use YAML block scalars** (`>-`, `>`, `|-`, `|`) in SKILL.md frontmatter — Cursor doesn't parse them. Use single-line quoted strings instead.
- `description` must be a single-line `"quoted string"`
- `metadata.version` must be 3-part semver: `"1.0.0"`

## Documentation Sync (CRITICAL)

**Every change to skills or plugin membership MUST update `README.md`.**

The skills table in README.md lists the `quatico-skills` plugin's skills. When you:

- **Add a skill**: add it to `skills/` and the README table (linked to its directory)
- **Remove a skill**: remove from `skills/` and the table

The README table must always match the actual contents of the `skills/` directory.

## Gates Over Rules

**For important agent behaviors, prefer gates, not rules.** ([Reference](https://blog.fsck.com/2026/04/07/rules-and-gates/))

- A **rule** is a guideline the agent can rationalize around — it lives in prose (`CLAUDE.md`, skill instructions) and depends on the agent choosing to follow it.
- A **gate** is a hard stop with objective verification — enforced via hooks or CI, where the agent cannot proceed without meeting a concrete, checkable condition.
- **The test:** Can you answer "Did I complete this?" without actually doing the work? If yes, it's a rule. If no, it's a gate.

When a skill includes a critical workflow (session teardown, credential handling, destructive operations), prefer a gate over prose. Even when the user casually says "add a rule for X," consider whether it should be a gate.

**Skill authors:** if your skill has a "MUST" or "NEVER", ask whether it's enforced (hook/CI) or just prose. Prose-only MUSTs eventually get violated — convert the critical ones to gates.

**Candidates in this repo:**

- "Documentation Sync (CRITICAL)" above is prose-only — a candidate for a CI check / pre-push hook that fails when the README skills table doesn't match `skills/`.
- Versioning is currently soft-gated: CI *warns* when a PR has no changeset, but doesn't fail. Hardening that into a failure would make it a gate.

## Plot Config

- **Branch prefixes:** idea/, feature/, bug/, docs/, infra/
- **Plan directory:** docs/plans/
- **Active index:** docs/plans/active/
- **Delivered index:** docs/plans/delivered/
- **Git host:** github
- **Tracker:** plot
- **Commit style:** arlo
- **Plan template:** .plot/templates/plan.md

Plot was in use here before it was configured — every key above records a path
this repo already uses, so nothing moves. Commit style is `arlo` (`F -`, `R -`,
`D -`, `b -` per [commit-notation](skills/commit-notation/SKILL.md)), not the
`conventional` that auto-detection guesses.

### Definition of Done

A change is done when all three pass:

1. `pnpm test` — skills parse (CI: `ci.yml`, every PR)
2. `pnpm run validate` — skill frontmatter valid (CI: `ci.yml`, every PR)
3. `pnpm test` in `skills/working-with-bitbucket-api/tests/` — the `bb`
   integration suite on Linux **and** macOS/bash 3.2 (CI: `bb-tests.yml`,
   only when the diff touches `bin/bb`)

Plus a changeset for any skill-touching change, per [Versioning](#versioning).

> **The changeset is a stricter standard than CI enforces.** `ci.yml` emits a
> warning and exits 0 when one is missing — the soft gate named under "Gates
> Over Rules" above. Treat it as required anyway: the release pipeline reads
> changesets to bump versions, so a missing one ships a skill change under an
> unchanged version number. Hardening the CI step into a failure would close
> the gap.
