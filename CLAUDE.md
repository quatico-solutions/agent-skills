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
