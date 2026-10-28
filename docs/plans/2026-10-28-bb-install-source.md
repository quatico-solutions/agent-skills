# `bb --help` and `--version` name the install source

> Three unrelated Homebrew packages answer to `bb`, and nothing at the terminal says which one is installed.

## Status

- **Phase:** Draft
- **Type:** feature
- **Sprint:** bb-cli-hardening
- **Issue:** #113
- **Review:** in-session
- **Impl:** same branch

## Changelog

- `bb --version` and `bb --help` name the package and its install command: `bb 1.12.1 (quatico-bb — brew install quatico-solutions/tap/quatico-bb)`.
- The `working-with-bitbucket-api` skill names `bb-cli` and the `bb` cask as look-alikes an agent must not install in its place.
- `install-dependencies.sh` and the skills that call `bb` check `bb --version` for `quatico-bb` first, and name the wrong install instead of failing later on an unknown flag.

## Motivation

On 2026-10-28 a user asked to "use bb from Homebrew everywhere" and installed `bb-cli`: a PHP Bitbucket CLI with different commands, no `api` and no `--json` (#113). Every Plot script and skill that calls `bb pr list --json` or `bb api` would have broken.

| Install | What it is |
|---|---|
| `brew install --cask bb` | getbb.app, an IDE for coding agents |
| `brew install bb-cli` | a PHP Bitbucket CLI (bb-cli.github.io) |
| `brew install quatico-solutions/tap/quatico-bb` | this CLI |

`bb --version` prints `bb 1.12.1` (`cli/bb:2786`), which does not tell the three apart. `skills/working-with-bitbucket-api/SKILL.md:22` warns about the cask but not about `bb-cli`.

## Design

### Approach

- `--version` prints `bb <version> (quatico-bb — brew install quatico-solutions/tap/quatico-bb)`. The first two words stay `bb <version>`, so a caller that reads the version with `awk '{print $2}'` keeps working.
- The first line of `bb --help` carries the same package name and install command.
- `SKILL.md`: one table of the three packages, the tap as the supported install, and the rule that an agent stops and reports when `bb --version` does not contain `quatico-bb`, instead of installing another package.
- Search `skills/` and `cli/` for callers that parse `bb --version` before changing the line. Plot's `bb_identify` (`plot-host.sh:2749`) reads the first semver and the word `quatico`; the new line keeps both and its parenthesis is not a hex SHA, so Plot identifies the build as `quatico/<version>` instead of `unknown/<version>`.
- **Self-check (second slice).** `install-dependencies.sh` and the skills that call `bb` — `working-with-bitbucket-api`, `handling-pull-requests`, `working-with-bitbucket-web`, `bye` — run `bb --version | grep -q quatico-bb` before the first `bb` call. On a miss they stop with one line naming the installed `bb` and the install command. The check needs the first slice's `--version` line, so the slice waits on it.

### Open Points

- [x] #113 lists the self-check as optional. Decided 2026-10-28: it lands here as a second slice; it stays the sprint's Could Have.

## Slices

### install source (Branch: feature/bb-install-source)

- `feature/bb-install-source` — package name and install command in `bb --version` and `bb --help`, look-alike table in `SKILL.md`, with cases in `tests/global-flags.test.ts` <!-- builds: install source in bb --version and bb --help -->

### bb self-check (Branch: feature/bb-self-check) <!-- waits: feature/bb-install-source -->

- `feature/bb-self-check` — `quatico-bb` check before the first `bb` call in `install-dependencies.sh` and the four skills that call `bb` <!-- builds: quatico-bb self-check in skills that call bb -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- The plan rides `feature/bb-install-source` with the first slice. The self-check slice opens its own branch once that merges.
