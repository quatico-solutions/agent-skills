# working-with-bitbucket-api

Development notes for the Bitbucket Cloud API skill.

## Overview

Skill for Bitbucket Cloud API access via `bb` CLI wrapper. Follows the same API-first pattern as `working-with-jira-web`: CLI for data operations, browser fallback for rich-text and visual tasks.

## Design Decisions

- **`gh` CLI conventions**: flag names (`--body`, `--head`, `--base`, `--reviewer`), command structure (`bb pr <verb>`), output modes (human-readable default, `--json` for machines)
- **macOS Keychain auth**: no tokens in files or env by default — `security find-generic-password` at runtime
- **Auto-detect workspace/repo**: parses `git remote get-url origin` so you don't have to type it
- **Bundled in qs-config**: `bb` script ships in `bin/bb` within this skill directory; `install-dependencies.sh` symlinks it to `~/bin/`
- **Defer to `--help`**: SKILL.md documents *when* and *why* to use `bb` (decision tree, auth scopes, fallback rules). Command syntax and flags live in `bb --help` / `bb <cmd> --help` — single source of truth, no sync burden. Inspired by the `show-your-work` pattern: "Duplicating tool flags in this skill → Run `--help` at runtime."
- **Clone `gh` CLI conventions**: Flag names, command structure (`bb pr <verb>`), output modes, and UX patterns mirror GitHub's `gh` CLI wherever possible. This leverages existing model knowledge about `gh` — agents already know `--body`, `--head`, `--base`, `--reviewer`, `--json`, etc.

## Dependencies

- `curl` (system)
- `jq` (homebrew)
- `security` (system — macOS Keychain CLI)
- `column` (system — for table formatting)

## History

- Developed in `qubert-config` (Phase 1: dogfood)
- Promoted to `qs-config` (Phase 2: shared team infrastructure)
- v0.1 (2026-02-25): Initial implementation
- v1.0.0 (2026-02-27): Auth login, versioning, API token migration, tested
