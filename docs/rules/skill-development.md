# Skill Development

How the repository is laid out and how skills are added, written and removed. This spoke details [AGENTS.md](../../AGENTS.md) Critical Rules 3 to 6.

## Repository Structure

A single plugin (`quatico-skills`) over a flat skill pool:

```
skills/          ← 19 skills (flat pool, one dir per skill)
cli/             ← bb, the Bitbucket CLI source; Homebrew installs it, this is not the installed copy
.claude-plugin/  ← marketplace.json + plugin.json
.cursor-plugin/  ← marketplace.json + plugin.json
```

Both marketplace manifests define one plugin, `quatico-skills`, with `source: "./"`. Skills are discovered from `skills/`, and commands from `commands/`, which is empty: the only command moved to plot-pm/plot with its skill. There are no symlinks. The layout follows the flat-pool convention of `anthropics/skills`.

## Skill Files

- Every skill has `SKILL.md` (frontmatter + instructions) and `README.md` (development notes).
- Optional: `REFERENCE.md`, `install-dependencies.sh`, `diagrams/`.
- An `install-dependencies.sh` targets macOS + Homebrew and is idempotent.
- A new skill goes in the top-level `skills/` directory.

## Shell Scripts

Shell scripts stay bash 3.2-compatible (AGENTS.md Critical Rule 3). The `bb-tests-macos` CI job gates `cli/bb` by pinning `/bin/bash`; no job checks the other scripts.

## Frontmatter

- No YAML block scalars (`>-`, `>`, `|-`, `|`) — Cursor does not parse them (AGENTS.md Critical Rule 4).
- `description` is a single-line `"quoted string"`.
- `metadata.version` is 3-part semver, `"1.0.0"`, and the release pipeline owns it (see `docs/rules/versioning.md`).

## README Sync

Every change to skills or plugin membership updates `README.md` (AGENTS.md Critical Rule 5). The skills table lists the `quatico-skills` plugin's skills:

- **Add a skill:** add it to `skills/` and add its row to the README table, linked to its directory, at its alphabetical place.
- **Remove a skill:** remove it from `skills/` and from the table.

The table always matches the contents of `skills/`, in alphabetical order by skill name.

## Gates Over Rules

For important agent behaviours, prefer gates to rules ([reference](https://blog.fsck.com/2026/04/07/rules-and-gates/)):

- A **rule** is a guideline the agent can rationalise around. It lives in prose (`AGENTS.md`, skill instructions) and depends on the agent choosing to follow it.
- A **gate** is a hard stop with objective verification, enforced by a hook or CI. The agent cannot proceed without meeting a concrete, checkable condition.
- **The test:** can you answer "Did I complete this?" without doing the work? If yes, it is a rule. If no, it is a gate.

When a skill includes a critical workflow (session teardown, credential handling, destructive operations), prefer a gate to prose. Even when someone asks to "add a rule for X", consider whether it should be a gate.

Skill authors: for each "MUST" or "NEVER" in a skill, ask whether a hook or CI enforces it. Prose-only MUSTs eventually get violated; convert the critical ones to gates.

Gate candidates in this repo:

- README sync (AGENTS.md Critical Rule 5) is prose-only. A CI check or pre-push hook could fail when the README skills table does not match `skills/` or is out of alphabetical order.
- The changeset requirement is soft-gated: CI warns when a PR has no changeset but does not fail (see `docs/rules/versioning.md` § Soft Gate).
