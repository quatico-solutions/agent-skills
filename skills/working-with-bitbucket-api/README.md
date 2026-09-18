# working-with-bitbucket-api

Development notes for the Bitbucket Cloud API skill.

## Overview

Skill for Bitbucket Cloud API access via `bb` CLI wrapper. Follows the same API-first pattern as `working-with-jira-web`: CLI for data operations (including image uploads via the repo Downloads area), browser fallback only for SSO-gated pages.

## Design Decisions

- **`gh` CLI conventions**: flag names (`--body`, `--head`, `--base`, `--reviewer`), command structure (`bb pr <verb>`), output modes (human-readable default, `--json` for machines). `bb pr list` also mirrors gh's scripting seam: `--json <fields>` selects gh-named fields (mapped to Bitbucket API paths) and `--jq <expr>` post-filters — so `bb pr list --json headRefName --jq '.[].headRefName'` matches the shape of the gh equivalent. See `bb pr list --help` for the field list.
- **macOS Keychain auth**: no tokens in files or env by default — `security find-generic-password` at runtime
- **Auto-detect workspace/repo**: parses `git remote get-url origin` so you don't have to type it
- **Installed via Homebrew**: the CLI lives at `cli/bb` in this repository, outside the skill directory. Homebrew installs and upgrades it from `quatico-solutions/tap/bb`; a person bumps the tap formula by hand after a release. The SKILL.md Step 0 gate checks that PATH's `bb` actually came from Homebrew and that it is current.
- **Defer to `--help`**: SKILL.md documents *when* and *why* to use `bb` (decision tree, auth scopes, fallback rules). Command syntax and flags live in `bb --help` / `bb <cmd> --help` — single source of truth, no sync burden. Inspired by the `show-your-work` pattern: "Duplicating tool flags in this skill → Run `--help` at runtime."
- **Clone `gh` CLI conventions**: Flag names, command structure (`bb pr <verb>`), output modes, and UX patterns mirror GitHub's `gh` CLI wherever possible. This leverages existing model knowledge about `gh` — agents already know `--body`, `--head`, `--base`, `--reviewer`, `--json`, etc.

## Dependencies

`bb` installs from Quatico's Homebrew tap:

    brew install quatico-solutions/tap/bb

The formula declares `jq`, so Homebrew installs that too. macOS supplies perl and `Unicode::Normalize`, which `bb` uses for NFC normalization; `install-dependencies.sh` checks for them and installs the formula.

The CLI source lives at `cli/bb` in this repository, outside the skill directory. Only Homebrew puts a `bb` on your PATH — running the copy in this repository directly runs a version nobody installed.

`bb` also depends on, at runtime:

- `curl` (system)
- `security` (system — macOS Keychain CLI)
- `column` (system — for table formatting)

`BB_INSTALL_DIR` no longer exists. It switched the old copy-install to a directory of your choosing, and there is no copy-install any more.

## History

- Developed in `qubert-config` (Phase 1: dogfood)
- Promoted to `qs-config` (Phase 2: shared team infrastructure)
- v0.1 (2026-02-25): Initial implementation
- v1.0.0 (2026-02-27): Auth login, versioning, API token migration, tested
