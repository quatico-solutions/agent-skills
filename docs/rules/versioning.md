# Versioning

Versioning is changeset-driven. This spoke details [AGENTS.md](../../AGENTS.md) Critical Rules 1 and 2; [CONTRIBUTING.md](../../CONTRIBUTING.md) has the full release flow.

## Owned Files

The release pipeline owns every version number (AGENTS.md Critical Rule 1):

- `metadata.version` in every `SKILL.md`
- `version` in `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json`
- both `marketplace.json` files
- `package.json`

## Changesets

Every change that touches a skill adds a changeset (AGENTS.md Critical Rule 2):

```bash
pnpm changeset   # scaffolds a file in .changeset/ from the template
```

Edit the created file. It holds a one-line summary (the `CHANGELOG.md` entry), a root-package bump in the frontmatter, and a `bumps:` block that lists each changed skill with its level:

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

## Bump Levels

Choose each level by impact. The levels apply to the root bump and to each skill bump:

- **Patch** (`x.y.Z`): bug fixes, wording improvements, minor clarifications
- **Minor** (`x.Y.0`): new sections, new patterns, expanded coverage, a new skill
- **Major** (`X.0.0`): structural reorganization, removed sections, breaking workflow changes

## Model Class

Skills are prompts, and prompts are model-dependent: a model update can change a skill's behaviour without a line of it changing. Record the model class a change was authored or tuned against as a sibling key in the `bumps:` block:

```yaml
<!--
bumps:
  skills:
    test-driven-development: minor
  tuned-against: claude-opus-5
-->
```

**Indentation matters.** `tuned-against:` sits at the same two-space indent as `skills:`. `bump-skill-versions.sh` treats any line indented four or more spaces as a skill entry, so a deeper indent is parsed as a skill name and fails CI's "non-existent skill directory" check.

Use the model family, not a dated snapshot (`claude-opus-5`, not `claude-opus-5-20260724`). Omit the key for model-independent changes, such as a broken link or a corrected CLI flag. When a skill is revised because a new model behaves differently, say so in the summary line too: that is the entry a reader needs when the next model lands.

## Release Flow

At release, `pnpm run version` consumes the changesets:

1. `bump-skill-versions.sh` bumps each `SKILL.md` from the `bumps:` blocks.
2. `changeset version` bumps `package.json` and writes `CHANGELOG.md`.
3. `sync-versions.sh` propagates the version to the plugin manifests and regenerates `marketplace.json`.

`release.yml` opens the release PR as a GitHub App when the repository holds the secrets `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY`. This repository uses the org-owned App `quatico-agent-skills-release`, first used for release 3.18.1. The App needs repository permissions Contents and Pull requests, both read and write, and must be installed on this repository. Without those secrets the PR comes from `github-actions[bot]`, and GitHub runs its checks only after a maintainer approves them under "Awaiting approval" on the PR.

## Soft Gate

CI only warns when a skill-touching PR has no changeset: `ci.yml` emits a warning and exits 0. Treat the changeset as required anyway. The release pipeline reads changesets to bump versions, so a missing one ships a skill change under an unchanged version number. Hardening the CI step into a failure would turn this rule into a gate (AGENTS.md Critical Rule 6).
