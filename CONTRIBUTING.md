# Contributing

Thanks for your interest in improving these skills. This repo is the
`quatico-skills` plugin — a flat pool of skills under `skills/`, installable in
Claude Code and Cursor.

## Setup

```bash
pnpm install
```

## Anatomy of a skill

Each skill is a directory under `skills/`:

```
skills/my-skill/
├── SKILL.md      # required: frontmatter + instructions
├── README.md     # required: development notes / design decisions
└── REFERENCE.md  # optional: detailed reference (>100 lines)
```

`SKILL.md` frontmatter rules:

- `name:` must match the directory name (lowercase, hyphens)
- `description:` a single-line quoted string (no YAML block scalars `>-`/`|` —
  Cursor can't parse them)
- `license:` e.g. `MIT`
- `metadata.version:` 3-part semver, e.g. `"1.0.0"`

See the **Creating Skills** section of the [README](README.md) for authoring
guidance, and the [Agent Skills spec](https://agentskills.io).

## Making a change

1. Branch off `main` (`feature/…`, `fix/…`, `docs/…`).
2. Edit or add the skill.
3. Validate locally:
   ```bash
   pnpm run validate   # frontmatter: name matches dir, version + license present
   pnpm test           # skills parse
   ```
4. **Add a changeset** (this drives versioning + the changelog):
   ```bash
   pnpm changeset
   ```
   Edit the created file: write a one-line summary, and in the `bumps:` block list
   each skill you changed with its bump level — `patch` (fixes/wording), `minor`
   (new sections/patterns), or `major` (breaking reorganization):
   ```yaml
   <!--
   bumps:
     skills:
       my-skill: minor
   -->
   ```
5. Open a PR to `main`. CI runs validation and checks for a changeset.

## Releases (maintainers)

Merging changesets to `main` makes the Release workflow open a **`release: x.y.z`**
PR. Merging that PR bumps versions, updates `CHANGELOG.md`, regenerates
`marketplace.json` (collection + per-skill entries), tags `vX.Y.Z` + per-skill
tags, and publishes a GitHub Release. Installed plugins auto-update on refresh.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Security
issues: see [SECURITY.md](SECURITY.md).
