---
name: pnpm
description: "Use when a task touches package.json, pnpm-lock.yaml, pnpm-workspace.yaml or node_modules: installing or upgrading, resolving lockfile merge conflicts, testing an unreleased library change in a consumer, patching a dependency, or running commands across a workspace. Triggers: pnpm, lockfile, merge conflict, overrides, pnpm patch, workspace, --filter, packageManager, corepack, 'can only be tested after release'."
license: MIT
compatibility: claude-code, cursor
metadata:
  version: "1.0.0"
---

# pnpm

Package workflows with pnpm: the facts that change a decision, six recipes that each end with the command proving they worked, and the shortcuts that cost more than they save.

## Facts that change decisions

- `node_modules` is isolated. Each package sees only its declared dependencies through symlinks into `node_modules/.pnpm`. Nothing is hoisted to the top level unless a setting asks for it.
- `pnpm-lock.yaml` is the source of truth. A plain `pnpm install` reuses every existing lockfile entry and resolves only new or changed specifiers. A manifest change can still move transitive entries when two manifests request different majors of the same package, so recipe 2 separates that case from an accidental full re-resolution.
- The lockfile holds one dependency graph per `name@version`. Two packages that need different transitive versions produce two entries; a diff that touches both is normal.
- The store is content-addressed. The lockfile pins each tarball's integrity hash, and a frozen install refuses a tarball whose hash changed.
- `pnpm install --frozen-lockfile` fails when the lockfile and the manifests disagree. CI turns it on by default, so it is the check that proves a lockfile is right.
- pnpm implements the npm commands it has with the same behaviour. `pnpm run` needs a script, `pnpm exec` needs a binary, and bare `pnpm <x>` runs a builtin command first, then a `package.json` script, then a binary from `node_modules/.bin` or `PATH`. It stops with `Command "<x>" not found` when none of the three matches.
- Settings live in `pnpm-workspace.yaml` (camelCase) or `.npmrc` (kebab-case). pnpm 10 also reads the `pnpm` field of the root `package.json`; pnpm 11 does not. REFERENCE.md lists the differences.

## Preflight checks

1. Run `pnpm -v` and compare it with the `packageManager` field in the root `package.json`. pnpm 10 and later download and run the pinned version on their own. A mismatch usually means a different pnpm is first on `PATH`, or a pnpm below 10 that does not honour the pin.
2. Note the major version. It decides where settings live and which flags exist.
3. Read the CI configuration before trusting a convenience script. A failing script proves the script is broken only when CI runs that script. The default branch is green until CI says otherwise.
4. Anchor search paths at the repository root. An empty search from a drifted working directory proves nothing.

## Recipes

### 1. Lockfile merge conflict

Situation: `git merge` or `git rebase` reports a conflict in `pnpm-lock.yaml`.

1. Resolve the conflicts in `package.json` and source files by hand. Leave the conflict markers in `pnpm-lock.yaml`.
2. Run `pnpm install`. pnpm detects the markers, merges both sides, and writes a clean lockfile. It prints `Merge conflict detected in pnpm-lock.yaml and successfully merged`.
3. Check the diff: `git diff --stat origin/main -- pnpm-lock.yaml`. Expect only the lines the working branch added.
4. Read every entry both branches changed. pnpm keeps both sides' entries and its documentation states that it cannot guarantee it picked the right head.
5. Prove: `pnpm install --frozen-lockfile` exits 0. The frozen install proves that lockfile and manifests agree, not that the merge chose the right version.
6. Stage the lockfile and complete the merge.

Variant, broken lockfile without markers: a textual merge done elsewhere produced valid-looking YAML with duplicate keys. `pnpm install --frozen-lockfile` fails with `ERR_PNPM_BROKEN_LOCKFILE … duplicated mapping key`. A plain `pnpm install` prints `WARN Ignoring broken lockfile` and regenerates the whole file, which re-resolves every floating range. Do one of these instead:

- Restore the lockfile from the base branch with `git checkout origin/main -- pnpm-lock.yaml` and run `pnpm install`. pnpm adds the entries the branch needs and keeps everything else.
- Redo the merge locally so the markers exist, then apply steps 1 to 6.
- Remove the duplicated block by hand, then run `pnpm install`.

Never delete `pnpm-lock.yaml` and reinstall. That upgrades every package with a floating range and hides the upgrades inside a merge commit.

### 2. Lockfile hygiene after a dependency change

Situation: `pnpm add`, `pnpm remove`, or a version bump changed the lockfile.

1. Run `git diff --stat -- pnpm-lock.yaml`. Expect a few lines per package added, removed, or bumped.
2. A large diff means something re-resolved. Common causes: a deleted or broken lockfile, `pnpm update`, `pnpm dedupe`, a changed override or peer setting, or two manifests that request different majors of the same transitive package.
3. When the diff is larger than the change explains: restore the lockfile from the base branch, run the intended command again (`pnpm add <pkg>@<version>`), and compare.
4. Prove: `pnpm install --frozen-lockfile` exits 0.
5. Commit only the lockfile lines the change needs.

### 3. Local verification of an unreleased library change

Situation: a library changed, a downstream project consumes the released package, and the task asks whether the change works there. The change is testable now. Nothing needs to be merged or published first.

1. In the library: run the build. Set a local version so the tarball name and the lockfile entry differ from every release: `pnpm version 1.2.3-local.1 --no-git-tag-version`. Run `pnpm pack --pack-destination /tmp/packs`. pnpm applies `files` and `publishConfig`, so the tarball is what a publish would upload. Inspect it with `tar tzf /tmp/packs/<name>-1.2.3-local.1.tgz` when in doubt.
2. In the consumer: point the package at the tarball.
   - Single-package repository: `pnpm add /tmp/packs/<name>-1.2.3-local.1.tgz`.
   - Workspace: add a root override with an absolute `file:` path. pnpm 10: `"pnpm": { "overrides": { "@scope/lib": "file:/tmp/packs/scope-lib-1.2.3-local.1.tgz" } }` in the root `package.json`, or `overrides:` in `pnpm-workspace.yaml`. pnpm 11: `pnpm-workspace.yaml` only. A non-root override is ignored with a warning.
3. Run `pnpm install` without `--frozen-lockfile`. The lockfile gains the tarball's integrity hash.
4. Prove: run the consumer's build and tests, then check the resolved path once. `ls -l node_modules/@scope/lib` in the consuming package's directory prints a symlink into `node_modules/.pnpm/` whose target names the local tarball. This works for an ESM-only package too.
5. Report what ran against the tarball. Revert the override or the `file:` specifier and the lockfile before committing, unless the task is to pin the tarball.

Re-pack after another change: bump the local suffix to `-local.2` and repeat from step 1. A tarball with the same version and new content fails a frozen install with `ERR_PNPM_TARBALL_INTEGRITY`, and an existing `node_modules` under a frozen install reports `Already up to date` and keeps the old files.

`pnpm link <dir>` is a smoke check, not a verification. It resolves the source layout, skips `files`, `publishConfig` and `exports`, runs no build, and does not install the linked package's dependencies. When a link is used, say so.

### 4. Dependency patch in place

Situation: a dependency has a bug, the fix is small, and the task cannot wait for an upstream release.

1. Run `pnpm patch <name>@<version>`. pnpm prints an editable directory.
2. Edit the files in that directory.
3. Run `pnpm patch-commit <directory>`. pnpm writes `patches/<name>@<version>.patch` and registers it under `patchedDependencies` (pnpm 10: root `package.json` or `pnpm-workspace.yaml`; pnpm 11: `pnpm-workspace.yaml`).
4. Prove: `pnpm install --frozen-lockfile` exits 0 and the test that exposed the bug passes.
5. Commit the patch file with the manifest and lockfile changes.
6. Open the upstream change afterwards. The patch is the local fork until the release lands; `pnpm patch-remove <name>@<version>` removes it then.

### 5. Workspace commands

Situation: the repository has `pnpm-workspace.yaml`.

- `pnpm -r <cmd>` runs in every package in dependency order. `pnpm --filter <pkg> <cmd>` runs in the selected package without `-r`.
- `--filter <pkg>...` adds dependencies. `--filter ...<pkg>` adds dependents. `--filter "...[origin/main]"` selects packages changed since a ref plus their dependents. `--filter ./packages/**` selects by path. A leading `!` excludes.
- `pnpm why <pkg>` at the workspace root prints nothing, because without `-r` it inspects only the root package's own dependencies. Use `pnpm why -r <pkg>` or `pnpm why --filter <package-name> <pkg>`.
- Depend on a sibling with `"@scope/sibling": "workspace:*"`. pnpm refuses to resolve it from a registry and rewrites it to the real version on `pack` and `publish`.
- Share a version pin across packages with `catalog:` in `pnpm-workspace.yaml` and `"react": "catalog:"` in the manifests.
- `overrides` take effect only at the root and apply to every package.
- `--ignore-scripts` skips every lifecycle script, including a `postinstall` that installs a nested package. Add an explicit install step for that package in CI.
- Prove: `pnpm -r exec pwd` lists every workspace package, and `pnpm why -r <pkg>` prints the packages that depend on `<pkg>`.

### 6. Toolchain and CI

- Respect the `packageManager` pin. pnpm 10 and later download and run the pinned version on their own; `pnpm self-update` maintains the pin. The pnpm maintainers do not recommend corepack, and Node 25 and later do not ship it.
- When a repository uses corepack anyway: install it with `npm i -g corepack@latest`, keep its integrity checks on, and never rely on a bare `corepack enable` inside a pipeline. Pin the version in `packageManager` with its hash, and let pnpm 10 and later or a versioned `corepack` install resolve that pin. The hash verifies the pnpm download.
- CI passes `pnpm install --frozen-lockfile` explicitly. The CI-detected default does not turn a broken lockfile into a failure. pnpm 11 adds `pnpm ci` for a clean frozen install.
- Since pnpm 10, dependency lifecycle scripts do not run unless the repository allows them (`pnpm approve-builds`; pnpm 11: `allowBuilds`). A missing native build is a policy, not a bug.
- Write `pnpm run` and `pnpm exec` explicitly in scripts and pipelines. Recommend `package.json` scripts over raw tool flags in documentation.
- Prove: `pnpm -v` prints the version named in `packageManager`, and `pnpm install --frozen-lockfile` exits 0.

## Pitfalls

| Observed phrase or shortcut | What is true | Recipe |
|---|---|---|
| "This can only be tested after merge and release" | `pnpm pack` produces the release artefact now; a root override installs it in the consumer | 3 |
| Delete `pnpm-lock.yaml` and reinstall | Every floating range re-resolves; unrelated upgrades land in the commit | 1, 2 |
| Hand-edit the lockfile to resolve a conflict | `pnpm install` on the markers merges both sides in one step; a hand edit is the fallback for a marker-free broken file only, it removes the duplicate block, and it never edits integrity hashes | 1 |
| Plain `pnpm install` on a broken lockfile "fixed it" | It printed a warning and regenerated the file | 1 |
| "pnpm hoisting explains why it resolves" | Nothing is hoisted to the top level by default; re-run the search from the repository root first, then check the package's own manifest and the hoist settings in `.npmrc` or `pnpm-workspace.yaml` | Facts, REFERENCE.md |
| `pnpm why` shows nothing, so it is not installed | Without `-r` it inspects only the root package's own dependencies; use `-r` | 5 |
| The script fails, so the default branch is broken | CI runs a different script, or a different pnpm; check both | Preflight checks |
| Disable corepack integrity checks or run a bare `corepack enable` so the pipeline passes | The `packageManager` hash verifies the download; a pipeline pins the corepack version or lets pnpm 10 and later resolve the pin | 6 |
| "This needs an upstream release first" | `pnpm patch` ships the fix in this repository today | 4 |
| `pnpm link` proved the change works | Link skips `files`, `publishConfig` and the build; the tarball is the proof | 3 |
| Retry `--frozen-lockfile`, add `--fix-lockfile`, prune the store | None of these read the error; `ERR_PNPM_BROKEN_LOCKFILE` names a YAML problem, `ERR_PNPM_OUTDATED_LOCKFILE` a manifest mismatch | 1, REFERENCE.md |

## Quick reference

```
pnpm install                         # reuse the lockfile, resolve only what changed
pnpm install --frozen-lockfile       # prove lockfile and manifests agree (CI)
pnpm add <pkg>[@<range>] [-D] [-w]   # -w targets the workspace root
pnpm remove <pkg>
pnpm why -r <pkg>                    # who depends on it, across the workspace
pnpm list -r --depth Infinity <pkg>
pnpm outdated -r
pnpm update -i -L                    # interactive, latest tags
pnpm dedupe --check                  # exit 1 when a dedupe would change the lockfile
pnpm pack --pack-destination <dir>
pnpm patch <name>@<version>          # then pnpm patch-commit <dir>, pnpm patch-remove <name>@<version>
pnpm -r <cmd>                        # every package; --filter <pkg> / --filter "...[origin/main]"
pnpm store path / pnpm store prune
pnpm dlx <pkg> [args]                # run a package binary without installing it
```

## Related skills

- `typescript-strict-patterns` covers initial project tooling once the packages are in place.
- Release and changeset conventions belong to the release skills and to each repository's own rules. This skill stops at the lockfile.

REFERENCE.md holds the version differences, install flags, settings, and error codes.
