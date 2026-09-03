# pnpm reference

Detail behind the recipes in `SKILL.md`. Checked against pnpm.io; version-dependent rows name the version.

## Contents

- [Settings locations](#settings-locations)
- [Install flags](#install-flags)
- [Hoisting and phantom dependencies](#hoisting-and-phantom-dependencies)
- [Registry and .npmrc](#registry-and-npmrc)
- [Supply-chain settings](#supply-chain-settings)
- [Error codes](#error-codes)
- [pack and publishConfig](#pack-and-publishconfig)
- [Link, file and tarball](#link-file-and-tarball)
- [Version pinning and corepack](#version-pinning-and-corepack)
- [Migration and import](#migration-and-import)

## Settings locations

| Setting | pnpm 10 | pnpm 11 |
|---|---|---|
| `overrides` | root `package.json` under `pnpm`, or `pnpm-workspace.yaml` | `pnpm-workspace.yaml` only |
| `patchedDependencies` | root `package.json` under `pnpm`, or `pnpm-workspace.yaml` | `pnpm-workspace.yaml` only |
| `onlyBuiltDependencies` / build allow-list | `pnpm-workspace.yaml` (`onlyBuiltDependencies`) or root `package.json` under `pnpm`, or `pnpm approve-builds` | `allowBuilds` map in `pnpm-workspace.yaml` |
| `catalog` / `catalogs` | `pnpm-workspace.yaml` (since 9.5) | `pnpm-workspace.yaml` |
| `minimumReleaseAge` | `pnpm-workspace.yaml` or `.npmrc` (since 10.16, default 0) | same, default 1440 |
| registry URLs | `.npmrc` `registry=` and `@scope:registry=` | `pnpm-workspace.yaml` `registries:`; `.npmrc` keeps auth tokens |
| hoist patterns, `nodeLinker` | `.npmrc` (kebab-case) or `pnpm-workspace.yaml` (camelCase) | same |

pnpm 11 ignores the `pnpm` field of `package.json` without an error. Use `pnpm-workspace.yaml` for every non-auth setting and it works on both majors.

## Install flags

| Command | Lockfile effect |
|---|---|
| `pnpm install` | Reuses existing entries. Resolves new or changed specifiers only. Regenerates the whole file when the lockfile is missing or unparsable. |
| `pnpm install --frozen-lockfile` | Writes nothing. Fails with `ERR_PNPM_OUTDATED_LOCKFILE` on a manifest mismatch and `ERR_PNPM_BROKEN_LOCKFILE` on an unparsable file. Default when a CI environment variable is set. |
| `pnpm install --lockfile-only` | Updates the lockfile and manifests, writes nothing to `node_modules`. Bypasses the CI frozen default. |
| `pnpm install --fix-lockfile` | Repairs broken entries. Does not scope resolution to one package. On a duplicate-key file it regenerates the whole lockfile, exactly as a plain install does. |
| `pnpm install --prefer-offline` / `--offline` | Skips staleness checks or the network. No resolution change. |
| `pnpm install --force` | Reinstalls everything. Does not bypass an integrity mismatch (pnpm 11.4 and later). |
| `pnpm update [pkg]` | Re-resolves within the manifest ranges. `-L` moves to the latest tag and rewrites the manifest. `-i` is interactive. |
| `pnpm dedupe` | Re-resolves to remove duplicate versions. `--check` only reports and exits 1 when a change would happen. |
| `pnpm ci` (pnpm 11) | `pnpm clean` followed by a frozen install. |

What moves unrelated entries: `update`, `dedupe`, a deleted or broken lockfile, a changed override, catalog, or peer setting. What does not: `add`, `remove`, and a plain install with an intact lockfile. The exception: a manifest change can still move transitive entries when two manifests request different majors of the same package; recipe 2 in `SKILL.md` covers that case.

## Hoisting and phantom dependencies

| Setting | Default | Meaning |
|---|---|---|
| `hoist` | `true` | Hoists into the hidden `node_modules/.pnpm/node_modules`; packages still see only their declared dependencies. |
| `hoistPattern` | `['*']` | What the hidden hoist includes. |
| `publicHoistPattern` | `[]` since 10.0 (earlier: eslint and prettier patterns) | What appears in the top-level `node_modules`. |
| `shamefullyHoist` | `false` | Equivalent to `publicHoistPattern: ['*']`; reproduces the npm layout. |
| `nodeLinker` | `isolated` | `hoisted` gives a flat tree; `pnp` gives Plug'n'Play. |

"pnpm does not work with package X" means X requires a dependency it does not declare. Fix in this order: add the missing dependency to the package that requires it (`pnpm add <missing>` there); hoist only the offender with `publicHoistPattern`; switch to `nodeLinker: hoisted` last, and only when the project cannot build otherwise. A `readPackage` hook in `.pnpmfile.cjs` can inject the dependency when the manifest cannot change.

After changing any setting that affects the `node_modules` layout, reinstall from clean: `pnpm clean` (pnpm 11) or remove `node_modules` and run `pnpm install`.

## Registry and .npmrc

- `registry=` in `.npmrc` sets the registry for installs and resolution, not only for publishing. `@scope:registry=` scopes it.
- The lockfile stores integrity hashes, not tarball URLs, unless `lockfileIncludeTarballUrl` is on. A frozen install still needs the registry setting to build the download URL.
- `.npmrc` has a project level (repository root, committed) and a user level (`~/.npmrc`, for auth tokens). Keep tokens out of the committed file. In containers, copy the project `.npmrc` with `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml`; mount the auth file into the home directory so it does not overwrite the project file.
- `pnpm fetch` warms the store from the lockfile alone and ignores the package manifest, which keeps a container layer valid across manifest edits that do not change dependencies. pnpm marks the command experimental.

## Supply-chain settings

| Setting | Since | Meaning |
|---|---|---|
| `minimumReleaseAge` (minutes) | 10.16 | Refuses versions published more recently than the value. pnpm 11 defaults to 1440 (one day). `minimumReleaseAgeExclude` lists exceptions. |
| `pnpm config set --global minimum-release-age 4320` | 10.16 | Three days, machine-wide. Global config file: `pnpm config get globalconfig` prints its path. |
| build allow-list | 10.0 | Dependency lifecycle scripts do not run unless allowed. `pnpm approve-builds` writes the list; pnpm 11 uses `allowBuilds`. |
| `blockExoticSubdeps` | 10.26 | Blocks git and URL dependencies below the top level. Off by default in 10.26; pnpm 11 defaults it on. |
| `trustPolicy: no-downgrade` | 10.21 | Refuses a version whose trust level dropped. Off by default. |
| `packageManager` hash | any | `pnpm@X.Y.Z+sha512.<hash>` verifies the pnpm download. |

## Error codes

| Code or message | Meaning | Fix |
|---|---|---|
| `ERR_PNPM_OUTDATED_LOCKFILE` | The lockfile does not match a manifest and the install is frozen. | Run `pnpm install` locally, check the diff is small (recipe 2), commit the lockfile. |
| `ERR_PNPM_BROKEN_LOCKFILE … duplicated mapping key` | The YAML has a duplicate key, usually from a marker-free textual merge. | Recipe 1 variant: restore from the base branch and reinstall, redo the merge with markers, or remove the duplicate block. Never regenerate. |
| `WARN Ignoring broken lockfile` | A plain install found an unparsable lockfile and regenerated it. | Treat the result as a full re-resolution. Discard it and apply recipe 1. |
| `Merge conflict detected in pnpm-lock.yaml and successfully merged` | pnpm merged the conflict markers. | Expected output of recipe 1. Prove with a frozen install. |
| `ERR_PNPM_TARBALL_INTEGRITY` | A tarball's content changed under the same version. | Bump the local version suffix (recipe 3). For a registry republish, `pnpm store prune` then reinstall. |
| `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` (pnpm 11) | A `node_modules` from another pnpm version needs purging and there is no terminal to confirm. | Set `CI=true` for the command, or `confirmModulesPurge: false`. |
| `The field "pnpm.overrides" was found in … This will not take effect` | An override sits in a non-root package. | Move it to the root (recipe 5). |
| `Command "<x>" not found` after `pnpm <x>` | No builtin command, no `package.json` script, and no binary in `node_modules/.bin` or on `PATH` carries that name. | `pnpm run <script>` for scripts, `pnpm exec <bin>` for dependency binaries, `pnpm dlx <pkg>` for one-off packages. |
| `ERR_PNPM_NO_SCRIPT` | `pnpm run <x>` names a script the manifest lacks. | Check `package.json` scripts in the package the command targets; in a workspace add `--filter`. |
| Unexpected peer dependency warnings | A package declares a peer range the tree does not satisfy. | `pnpm peers check` (pnpm 11); `peerDependencyRules.allowAny` takes package name patterns and resolves a matching peer from any version, which silences a known-safe case. |

## pack and publishConfig

- `pnpm pack` writes `<name>-<version>.tgz`; a scoped name becomes `<scope>-<name>-<version>.tgz`. `--pack-destination <dir>` chooses the directory; pnpm 10 adds `--out 'dist/%s-%v.tgz'`, `--dry-run` and `--json`.
- `files` in `package.json` selects what goes in, with `package.json` and `README` always included.
- `publishConfig` overrides these manifest fields inside the tarball: `bin`, `main`, `exports`, `types` / `typings`, `module`, `browser`, `esnext`, `es2015`, `unpkg`, `umd:main`, `typesVersions`, `cpu`, `os`, `engines`. The `publishConfig` block itself is removed.
- `workspace:` and `catalog:` specifiers become concrete versions in the packed manifest.
- `prepack` runs before packing; `--ignore-scripts` skips it and packs whatever is on disk.
- Inspect a tarball with `tar tzf <file>`; compare two with `tar xzf` into separate directories and `diff -r`.

## Link, file and tarball

| Method | Installs the package's dependencies | Applies `files` and `publishConfig` | Runs the build | Proves what ships |
|---|---|---|---|---|
| `pnpm link <dir>` | no | no | no | no |
| `"pkg": "file:../dir"` (directory) | yes | no | no | no |
| `"pkg": "file:/abs/pkg-1.2.3-local.1.tgz"` or `pnpm add ./pkg.tgz` | yes | yes | yes, at pack time | yes |

pnpm 11 keeps only `pnpm link <dir>`; the global link forms are gone. The tarball path is the one recipe 3 uses.

## Version pinning and corepack

- `packageManager` in the root `package.json` pins the pnpm version, optionally with a hash: `pnpm@10.27.0+sha512.<hash>`.
- pnpm 10 and later honour the pin on their own (`managePackageManagerVersions`, default on). pnpm 11 adds `devEngines.packageManager` with ranges and `pmOnFail` (`download` by default). `pnpm self-update` moves the pin; `pnpm with <version> <args>` runs another version once.
- Corepack: absent from Node 25 and later, and not the pnpm maintainers' recommended install path. When a repository uses it: `npm i -g corepack@latest` installs or updates it, `corepack enable` creates the shims, and the `packageManager` hash verifies the download. Do not disable its integrity checks. A pipeline pins the corepack version instead of running a bare `corepack enable`, or lets pnpm 10 and later resolve the `packageManager` pin on its own.
- `engines.pnpm` declares a compatible range and pnpm enforces it only with `engineStrict`; `packageManager` pins the exact version that runs. Use `packageManager` for the pin.
- `"preinstall": "npx only-allow pnpm"` in a private root manifest stops installs with another manager. Never add it to a published package.
- Node version: pnpm 11 replaces `pnpm env` with `pnpm runtime set node <version> [-g]` and `devEngines.runtime`.

## Migration and import

- `pnpm import` converts `package-lock.json`, `npm-shrinkwrap.json` or `yarn.lock` into `pnpm-lock.yaml` and keeps the pinned versions. In a monorepo, create `pnpm-workspace.yaml` first, or the import misses the workspace packages.
- Copy the `workspaces` array from `package.json` into `pnpm-workspace.yaml`, then remove it from `package.json` by hand. `npm pkg set workspaces='["packages/*"]'` fails with `newWorkspaces.some is not a function`.
- Replace `yarn <script>` with `pnpm <script>`, `yarn --cwd <dir> <script>` with `pnpm --filter <pkg> <script>` or `pnpm --dir <dir> run <script>`.
- Run `pnpm install` once to normalise the imported lockfile, then `pnpm install --frozen-lockfile` to prove it.
- The migration is done when an install runs without warnings and the build scripts pass; fixing a phantom dependency belongs to that step, not to a hoist setting.
