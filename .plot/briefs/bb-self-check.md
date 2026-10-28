## Implementation brief — bb-install-source (wave 2: bb self-check)

- **Plan (canonical):** docs/plans/2026-10-28-bb-install-source.md on main
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `feature/bb-self-check` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** in-session, per the plan

This branch waits on `feature/bb-install-source`, which merged as PR #122. `bb --version` now prints `bb <version> (quatico-bb — brew install quatico-solutions/tap/quatico-bb)`, so the check below has a line to match.

### What to build

On 2026-10-28 a user installed `bb-cli` (a PHP Bitbucket CLI with no `api` and no `--json`) instead of `quatico-bb` (#113). Every `bb pr list --json` and `bb api` call then failed later, on an unknown flag, with no hint about the wrong install. Slice 1 made the install source visible. This slice makes the callers check it before their first `bb` call.

Add `bb --version | grep -q quatico-bb` before the first `bb` call in `skills/working-with-bitbucket-api/install-dependencies.sh` and in four skills: `working-with-bitbucket-api`, `handling-pull-requests`, `working-with-bitbucket-web`, `bye`. On a miss, the caller stops with one line that names the installed `bb` and the install command. The plan is canonical; this brief is orientation.

### Decisions the plan settles — do not re-derive them

- **Match on `quatico-bb`, not on a version number.** `bb-cli` and the getbb.app cask also print a version, so a version regex cannot tell the three packages apart. The word `quatico-bb` appears only in this CLI's line.
- **Stop, do not install.** `SKILL.md:32` already says an agent that sees another `bb` stops and reports it. The self-check does not run `brew install` as a fix, and it never uses a bare `bb` name in `brew install` (that name resolves to the cask).
- **The first two words of `--version` stay `bb <version>`.** Do not change `cli/bb`. Callers parse `awk '{print $2}'`, and Plot's `bb_identify` reads the first semver and the word `quatico`. This slice touches no `cli/bb` line, so the `bb-tests` job does not run.
- **Absent is not the same as wrong.** A missing `bb` (command not found) and a foreign `bb` need different messages: the first says "install `quatico-bb`", the second says "`bb` here is not quatico-bb". Read the exit code of `command -v bb`; do not infer a missing binary from empty output.
- **`SKILL.md` step 0 already gates on Homebrew currency.** Fold the install-source check into that gate in `working-with-bitbucket-api`; the other three skills point at it or carry one line, and do not copy the table.

### Done when

The plan's `## Definition of Done` is the specification. Assertions to add because a naive change passes without them:

- A stub `bb` on `PATH` that prints `bb 0.9.0` makes the check fail with the install command in the message. This catches a check that only tests "runs and prints a version".
- A stub that prints the new quatico line passes. This catches a `grep` pattern that misses the em dash line.
- No `bb` on `PATH` gives the "not installed" message, not the "wrong package" message.

Plus: `pnpm test`, `pnpm run validate`, and a changeset (`pnpm changeset`) with a `bumps:` block for every touched skill; indent `tuned-against:` by two spaces. Hand-edit no version number. Bash 3.2 rule applies to `install-dependencies.sh`: no `mapfile`, no `${var^^}`. For tests, run `node <plot scripts>/board/plot-local-checks.mjs` before each push and run what it prints; the `CI suites` config key runs in CI.

`scripts/check-shell-lines.sh` refuses a pull request whose shell under `skills/` is longer than at its merge base. `install-dependencies.sh` is shell, so growth is paid for in the same change: remove shell elsewhere, or state the rule in the skill prose. Joining statements with `;` or `&&` is not a payment.

### Bookkeeping

Open the PR with `plot-open-pr.sh` (use `--draft` while the work moves), never `gh pr create`. Append `→ #<number>` to the `feature/bb-self-check` line in the plan's `## Slices`. Push the first real commit as soon as it exists. Commit style is `arlo-colon` (`F: …`).

### Scope guard

This branch owns `skills/working-with-bitbucket-api/install-dependencies.sh`, the `SKILL.md` of the four named skills, and one changeset. It does not touch `cli/bb`. No other plan branch is in flight on these files (`feature/bb-whoami` merged as #121). If another skill calls `bb` and is not on the list, report it rather than adding it.
