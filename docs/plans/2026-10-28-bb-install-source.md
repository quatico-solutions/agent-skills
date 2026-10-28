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
- Search `skills/` and `cli/` for callers that parse `bb --version` before changing the line.

### Open Points

- [ ] #113 lists a self-check in every script that calls `bb` as optional. It is the sprint's Could Have; decide during implementation whether it lands here as a second slice or in a follow-up plan.

## Slices

### install source (Branch: feature/bb-install-source)

- `feature/bb-install-source` — package name and install command in `bb --version` and `bb --help`, look-alike table in `SKILL.md`, with cases in `tests/global-flags.test.ts` <!-- builds: install source in bb --version and bb --help -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes
