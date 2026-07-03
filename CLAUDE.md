# CLAUDE.md

Agent instructions for the `agent-skills` repository.

## Repository Structure

A single plugin (`quatico-skills`) over a flat skill pool:

```
skills/          ← 17 skills (flat pool, one dir per skill)
commands/        ← 1 command
.claude-plugin/  ← marketplace.json + plugin.json
.cursor-plugin/  ← marketplace.json + plugin.json
```

Both marketplace manifests define one plugin, `quatico-skills`, with `source: "./"`; skills are discovered from `skills/` and commands from `commands/`. No symlinks. Layout follows the flat-pool convention of `anthropics/skills`.

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

At release, `pnpm run version` consumes the changesets: `bump-skill-versions.sh` bumps each `SKILL.md` from the `bumps:` blocks, `changeset version` bumps `package.json` and writes `CHANGELOG.md`, and `sync-versions.sh` propagates the version to the plugin manifests and regenerates `marketplace.json`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow.

> CI only *warns* when a skill-touching PR has no changeset (a soft gate) — don't rely on it, add the changeset yourself.

## Skill Development

- Every skill has `SKILL.md` (frontmatter + instructions) and `README.md` (development notes)
- Optional: `REFERENCE.md`, `install-dependencies.sh`, `diagrams/`
- Skills with `install-dependencies.sh` must be macOS + Homebrew, idempotent
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
