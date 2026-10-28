## Implementation brief — bb-scripted-calls (wave 1: no false success)

- **Plan (canonical):** `docs/plans/2026-10-28-bb-scripted-calls.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `bug/bb-transport-failure` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`
- **Review of the code:** per repo convention (PR review); panel round 1 is in `.plot/panels/2026-10-28-bb-scripted-calls/`

Three branches wait on this one: `bug/bb-rate-limit-exit` (`waits: bug/bb-transport-failure`), then `feature/bb-pr-list-head`, and `feature/bb-whoami` from plan `bb-whoami`. Land it small and soon.

### What to build

With nothing listening on the API port, `bb pr list --all --json` prints `[]` and exits 0, and `bb auth status` prints nothing and exits 0. Measured 2026-10-28:

```
$ BB_API_URL=http://127.0.0.1:9 BB_TOKEN=x BB_EMAIL=x cli/bb -R ws/repo pr list --all --json; echo $?
curl: (7) Failed to connect to 127.0.0.1 port 9 after 0 ms: Couldn't connect to server
[]
0
```

curl writes `000` as `%{http_code}` when no response arrives, and every status check in `cli/bb` is `[[ "$http_code" -ge 400 ]]`, which `000` passes. Make **only a 2xx** count as success, and give `000` its own message: `error: no response from Bitbucket`, exit 1.

The five checks, all the same shape:

| Line | Function | Used by |
|---|---|---|
| `cli/bb:184` | `bb_api_call` | `bb api`, `auth status`, every single-object command |
| `cli/bb:249` | `bb_paginate` | every listing |
| `cli/bb:288` | `bb_api_raw` | `pr diff`, `source cat`, raw reads |
| `cli/bb:337` | `bb_download_upload` | `download upload`, `pr comment --image` |
| `cli/bb:749` | `cmd_auth_login` | `auth login` credential check |

The plan names the first three. The other two have the identical defect and the plan's changelog states the rule for every request ("`bb` exits non-zero when a request gets no HTTP answer"), so fix all five and say in the PR description that the last two go beyond the plan's list. `auth login` matters most of the two: today it would store credentials after a failed connection.

Also add the script-author rule to `skills/working-with-bitbucket-api/SKILL.md`: check `bb`'s exit status, or `set -o pipefail` when piping `bb` into another command. #111's incident was a Python caller that ignored exit 1; this is the sentence that would have prevented it.

The plan is canonical; this is orientation.

### Settled — do not re-derive

- **Do not rely on `set -e` to catch the curl failure.** `bb` runs `set -euo pipefail`, yet the failure passes: `bb_paginate` runs inside `$(…)` under `|| { …; exit 1; }` at `cli/bb:919`/`:927`, which disables `errexit` for the whole callee, and bash 3.2 has no `inherit_errexit`, so `response="$(curl …)"` inside a command substitution never aborts. Check the status explicitly.
- **Test the status as a range, not `-ge 400`.** `[[ "$http_code" =~ ^2[0-9][0-9]$ ]]` (or a numeric 200–299 test) — `000`, `1xx` and `3xx` after `-L` are all not success.
- **Exit 1, not a new code.** The rate-limit code (75) belongs to the next slice, `bug/bb-rate-limit-exit`. Do not touch the 429 branch at `cli/bb:251` beyond keeping it working.
- **Keep the no-rows-on-failure rule** from `bb-paginate-backoff` (v3.18.1): a failed listing prints no partial array. `pr-list.test.ts` already pins it for 429; add the transport case.
- **bash 3.2 only** (AGENTS.md rule 3): no `declare -A`, no `${var^^}`, no `mapfile`; `BASH_REMATCH` and `[[ =~ ]]` are fine.
- **Invariant this repo keeps re-learning: absent is not false.** An empty body is not an empty list; only a 2xx body is data.

### Done when

- `bb pr list --all --json` against a closed port exits 1, prints nothing on stdout, and prints `error: no response from Bitbucket` on stderr. Catches the measured bug.
- `bb api /user` and `bb auth status` against a closed port exit 1. Catches the `bb_api_call` path, which `bb-whoami` depends on.
- `bb auth login` against a closed port exits 1 and stores nothing. Catches the credential-store hazard.
- The existing 429 cases in `tests/pr-list.test.ts` still pass unchanged (exit 1 after the last retry).
- `SKILL.md` carries the exit-status / `pipefail` rule.

Tests go in `skills/working-with-bitbucket-api/tests/` (`pr-list.test.ts`, `api.test.ts`, `auth-status.test.ts`, `auth-login.test.ts`). A closed port needs no mock server: point `BB_API_URL` at `http://127.0.0.1:<unused port>`.

Plus the repo gates: `pnpm test`, `pnpm run validate`, the `bb` suite (`cd skills/working-with-bitbucket-api/tests && pnpm test`) green on Linux and macOS `/bin/bash` 3.2 (CI job `bb-tests-macos`), and a changeset (`pnpm changeset`) with a `bumps:` block for `working-with-bitbucket-api`. Run `node ~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `plot-open-pr.sh` (`--draft` while it moves), never `gh pr create`.
- When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section.

### Scope guard

This branch owns: the five status checks in `cli/bb` and a shared helper if you add one, the transport-failure tests, the `SKILL.md` exit-status paragraph, one changeset.

Not this branch:
- exit 75, the final 429 line and the call sites `cli/bb:141`, `:149`, `:919`, `:927`, `:2651` → `bug/bb-rate-limit-exit`
- `--head` → `feature/bb-pr-list-head`
- `cmd_api` path handling → `bug/bb-api-path-slash`
- `bb whoami` → `feature/bb-whoami` (plan `bb-whoami`, on its branch)
- `--version` / `--help` text → `feature/bb-install-source` (plan `bb-install-source`, on its branch)

If you find something the plan did not anticipate, report it rather than improvising outside scope.
