## Implementation brief — bb-install-source (wave 2: bb self-check)

- **Plan (canonical):** `docs/plans/2026-10-28-bb-install-source.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `feature/bb-self-check` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`
- **Review of the code:** green, CLEAN slice PRs are merged automatically by the operator's session loop; there is no human code review, so the tests are the review

Wave 1 (`feature/bb-install-source`, #122) is merged: `bb --version` now prints `bb <version> (quatico-bb — brew install quatico-solutions/tap/quatico-bb)`. This is the plan's last slice; when it merges, `bb-install-source` can be delivered. It is the sprint's Could Have.

### What to build

On 2026-10-28 a user installed `bb-cli` (a PHP Bitbucket CLI with no `api` and no `--json`) because three Homebrew packages answer to `bb` (#113). Every skill call then fails later on an unknown flag, which reads like an API or auth problem. Make the check happen **before** the first `bb` call, where the failure names the cause.

1. **`skills/working-with-bitbucket-api/install-dependencies.sh`** — after `"$BIN_DIR/bb" --version` (`:185`), check that the output contains `quatico-bb`. On a miss: print one line naming what `bb --version` printed and the supported install command (`brew install quatico-solutions/tap/quatico-bb`), and exit 1. Note: a Quatico `bb` older than 1.12.1+#122 prints `bb 1.12.1` without the suffix; the script just installed or upgraded from the tap, so the binary it checks is the new one — but say in the message to upgrade if the version is old.
2. **The skills that call `bb`** — `handling-pull-requests` (`SKILL.md:106` onward), `working-with-bitbucket-web` (`SKILL.md:20`, `:109`), `bye` (`SKILL.md:55`). Each gets one instruction before its first `bb` command: run `bb --version | grep -q quatico-bb`; on a miss, stop and report which `bb` is installed, and do not install another package — the rule `working-with-bitbucket-api/SKILL.md:32` already states. Point to that section instead of copying its package table.
   - `working-with-bitbucket-api/SKILL.md` already carries the rule (slice 1); do not duplicate it there.

The plan is canonical; this is orientation.

### Settled — do not re-derive

- **Match `quatico-bb`, not `quatico`.** Plot's `bb_identify` matches the looser `quatico`; skills should check the package name `#122` prints.
- **Stop and report; never install.** The plan's rule: an agent does not swap in another package.
- **No new `SKILL.md` frontmatter keys and no block scalars** (AGENTS.md rule 4). Do not touch `metadata.version` (rule 1).
- **bash 3.2** for `install-dependencies.sh` (rule 3).

### Done when

- `install-dependencies.sh` exits 1 with one line naming the foreign output when a stub `bb` on `PATH` prints `bb-cli 2.0` (or nothing), and passes when it prints the #122 line. If the script is hard to run in a test (it calls `brew`), test the check as a small function you extract within the script, or document a manual run with stubs in the PR body — say which.
- The three skills each name the check before their first `bb` command and link to `working-with-bitbucket-api`.
- `pnpm test` and `pnpm run validate` pass (skills parse, frontmatter valid).

Plus a changeset (`pnpm changeset`) with a `bumps:` block naming every skill whose files changed (`working-with-bitbucket-api`, `handling-pull-requests`, `working-with-bitbucket-web`, `bye`), patch each. Run `node ~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `plot-open-pr.sh` (`--draft` while it moves), never `gh pr create`. Mark it ready only when every check above passes: a ready, green, CLEAN PR is merged automatically.
- When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section.

### Scope guard

This branch owns: the `quatico-bb` check in `install-dependencies.sh`, one instruction each in `handling-pull-requests`, `working-with-bitbucket-web`, `bye`, one changeset.

Not this branch: `cli/bb` (another agent edits it in parallel on `bug/bb-one-line-errors`); the `--version` line (merged in #122); the package table in `working-with-bitbucket-api/SKILL.md` (merged in #122).

If you find something the plan did not anticipate, report it rather than improvising outside scope.
