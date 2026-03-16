# CLAUDE.md

Agent instructions for the `agent-skills` repository.

## Repository Structure

Skills live flat in `skills/` and are referenced via symlinks from plugin directories:

```
skills/              ← actual skill sources
commands/            ← actual command sources
plugins/
  essentials/        ← 20 skills + 1 command (symlinks)
  bdd-methodology/   ← 3 skills (symlinks)
  agent-admin/       ← 3 skills (symlinks)
```

The marketplace (`.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`) lists all plugins.

## Versioning

Every skill MUST have a `metadata.version` field in its SKILL.md frontmatter (semver, 3-part).

**When a skill is changed, increment its version:**

- **Patch** (`x.y.Z`): bug fixes, wording improvements, minor clarifications
- **Minor** (`x.Y.0`): new sections, new patterns, expanded coverage
- **Major** (`X.0.0`): structural reorganization, removed sections, breaking workflow changes

**When any skill version is bumped, bump the plugin version** in the plugin's `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, and both root marketplace files:

- Skill patch → plugin patch (at minimum)
- Skill minor → plugin minor (at minimum)
- Skill major → plugin major

**When a skill is added or removed from a plugin**, bump that plugin's minor version (add) or major version (remove).

## Skill Development

- Every skill has `SKILL.md` (frontmatter + instructions) and `README.md` (development notes)
- Optional: `REFERENCE.md`, `install-dependencies.sh`, `diagrams/`
- Skills with `install-dependencies.sh` must be macOS + Homebrew, idempotent
- When adding a new skill, create the symlink in the appropriate plugin directory

## Documentation Sync (CRITICAL)

**Every change to skills or plugin membership MUST update `README.md`.**

The skills table in README.md is grouped by plugin (essentials, bdd-methodology, agent-admin). When you:

- **Add a skill**: add it to the correct plugin table and create the symlink in `plugins/{name}/skills/`
- **Remove a skill**: remove from the table and delete the symlink
- **Move a skill between plugins**: update both tables and move the symlink

The table-to-plugin mapping must always match the actual symlinks in `plugins/`.
