## Implementation brief — bb-scripted-calls (wave 4: api path)

- **Plan (canonical):** `docs/plans/2026-10-28-bb-scripted-calls.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session
- **Branch:** `bug/bb-api-path-slash` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`
- **Review of the code:** green, CLEAN slice PRs are merged automatically by the operator's session loop; there is no human code review, so the tests are the review

Waves 1 to 3 (#117, #119, #120) do not block this slice. It touches only `cmd_api` and has no `waits:`.

### What to build

`bb api 'repositories/…'` (no leading `/`) requests `…/2.0repositories/…` and answers `HTTP 403 — Forbidden`, because `bb_api_call` builds `"${BB_API}${path}"` (`cli/bb:233`). A full `next` URL pasted from a listing becomes `…/2.0https://api.bitbucket.org/2.0/…`. The help text says "Paths are relative to https://api.bitbucket.org/2.0", so a reader takes the slash as optional (#111, failure 4).

In `cmd_api` (`cli/bb:2527`), after the `{ws}`/`{repo}` substitution and before the `bb_api_call`:

1. Strip a leading `"$BB_API"` from `path`. `BB_API` is `https://api.bitbucket.org/2.0` in production and the loopback mock URL under test, so one expansion covers both.
2. If `path` still starts with `http://` or `https://`, refuse locally: usage-style error on stderr, exit 1, no request sent.
3. If `path` does not start with `/`, prepend one.

Update the `bb api` help (`PATH SHORTCUTS` or a new `PATH FORMS` block, plus one example without the slash) and the `bb api` lines in `skills/working-with-bitbucket-api/SKILL.md` (`:191`–`:196`).

The plan is canonical; this is orientation.

### Settled — do not re-derive

- **Refuse other hosts; never forward them.** `bb_api_call` sends the token as HTTP Basic on every call. Passing an arbitrary URL through would send the token to that host. This is the same reason `BB_API_URL` is restricted to loopback (`cli/bb:6`–`:19`). Refusing is the whole point of step 2.
- **Strip `$BB_API`, not a hard-coded string.** The test suite sets `BB_API_URL=http://localhost:<port>/mockbb`; a hard-coded `https://api.bitbucket.org/2.0` never matches in tests and the full-URL case goes untested.
- **The order is strip, then refuse, then prepend.** Prepending first turns `https://evil/x` into `/https://evil/x` and slips past the refusal.
- **Compare the prefix on a path boundary.** `https://api.bitbucket.org/2.0evil` must not strip to `evil`. After the strip the remainder must be empty, or start with `/` or `?`; otherwise it falls through to the refusal in step 2.
- **No change to `bb_api_call`.** Other callers always pass a `/`-prefixed path. Normalising in `cmd_api` keeps the diff to one function.
- **Exit codes from #117 and #119 stay as they are** (1 for no response, 75 for 429). Do not touch them.
- **bash 3.2 only** (AGENTS.md rule 3). Use `${path#"$BB_API"}` and `[[ == ]]` globs; no `${var,,}`, no `=~` with stored regexes.

### Done when

In `skills/working-with-bitbucket-api/tests/api.test.ts`, asserting the path the mock server received (`server.getLastCall().path`):

- `bb api repositories/testws/testrepo` → request path `/repositories/testws/testrepo`, exit 0. Catches the 403.
- `bb api "http://localhost:<port>/mockbb/user"` → request path `/user`. Catches the full-URL case; this is the test that fails if `BB_API` is hard-coded.
- `bb api https://example.com/x` → exit 1, error on stderr, **zero requests reach the server** (`server.getCalls()` is empty). **A naive implementation passes without this**: it still exits 1 on a 404, but has already sent the token.
- `bb api "http://localhost:<port>/mockbbevil/x"` → refused, zero requests. Catches the boundary check.
- `bb api /user` and `bb api '{ws}/…'` shapes still work (existing cases stay green).

Plus the repo gates: `pnpm test`, `pnpm run validate`, the `bb` suite (`cd skills/working-with-bitbucket-api/tests && pnpm test`) green on Linux and macOS `/bin/bash` 3.2 (the diff touches `cli/bb`), and a changeset (`pnpm changeset`) with a `bumps:` block for `working-with-bitbucket-api` (patch: a bug fix). Run `node ~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. The shell-lines gate (`scripts/check-shell-lines.sh`) counts commands in `cli/bb` and has no override; keep the normalisation to a few commands.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `plot-open-pr.sh` (`--draft` while it moves), never `gh pr create`. Mark it ready only when every check above passes locally: a ready, green, CLEAN PR is merged automatically.
- When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section.

### Scope guard

This branch owns: path normalisation and help in `cmd_api`, the new cases in `tests/api.test.ts`, the `bb api` lines in `skills/working-with-bitbucket-api/SKILL.md`, one changeset.

Not this branch:
- `bb_api_call` / `bb_api_raw` internals and retry on 429 → open point in the plan, follow-up
- `cmd_pr_list` and `--head` → merged in #120
- `bb whoami` → `feature/bb-whoami`; `--version` text → `feature/bb-install-source` (worked by a person on their own branches)

No other branch is in flight in `cmd_api` right now.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
