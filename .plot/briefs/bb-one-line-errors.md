## Implementation brief — bb-whoami (wave 2: one-line errors)

- **Plan (canonical):** `docs/plans/2026-10-28-bb-whoami.md` on `main`
- **Approved:** 2026-10-28, jwloka, in-session (delivered, then rejected 2026-10-28 to add this slice)
- **Branch:** `bug/bb-one-line-errors` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`
- **Review of the code:** green, CLEAN slice PRs are merged automatically by the operator's session loop; there is no human code review, so the tests are the review

Wave 1 (`feature/bb-whoami`, #121) is merged. Nothing waits on this branch; when it merges, `bb-whoami` is delivered again.

### What to build

The plan promises that a failed `bb whoami` prints **one** stderr line and exits non-zero. Delivery panel round 1 (`.plot/panels/2026-10-28-bb-whoami/deliver-panel.md`) ran it and found two paths that print more:

```
# no credentials (BB_TOKEN unset, no keychain item)       → exit 1
error: no Bitbucket API token found
  Run: bb auth login
  Or export BB_TOKEN=<token>

# no response (BB_API_URL=http://127.0.0.1:9)              → exit 1
curl: (7) Failed to connect to 127.0.0.1 port 9 after 0 ms: Couldn't connect to server
error: no response from Bitbucket
```

The operator ruled "one line" a contract. Both causes are shared code, so the fix changes the error output of **every** `bb` command, not only `whoami`:

1. **`bb_token`** (`cli/bb:45`, the three `echo >&2` lines at `:53`–`:55`): one line, `error: no Bitbucket API token found — run: bb auth login, or export BB_TOKEN=<token>`. `bb_email` (`cli/bb:60`) already prints one line; leave its wording, but check it.
2. **No HTTP answer.** The five curl calls run with `-sS`, so curl writes its own `curl: (N) …` line to stderr, and `bb_check_status` (`cli/bb:175`) then writes `error: no response from Bitbucket`. Keep curl's reason — it is the only place a DNS, TLS or connect failure is named — but carry it **inside** `bb`'s one line: capture curl's stderr to a temp file at each call site, pass it to `bb_check_status` as a third argument, and print `error: no response from Bitbucket (<curl reason without the "curl: " prefix>)`. Remove the temp file on every path.
   - Call sites: `bb_api_call` (`cli/bb:198`, check at `:208`), `bb_paginate` (`:247`, check at `:283`), `bb_api_raw` (`:307`, `:314`), `bb_download_upload` (`:352`, `:358`), `cmd_auth_login` (`:786`, its own check further down).
   - Do not drop `-S` and lose the reason; do not keep both lines.

The plan is canonical; this is orientation.

### Settled — do not re-derive

- **Exit codes do not change.** 1 for errors, 75 for HTTP 429 (merged in #119); every `|| return $?` / `|| { rc=$?; …; exit "$rc"; }` stays. A 429 is not "no response" and keeps `error: rate limited …`.
- **Never `429` in a message** — Plot's `host_failure_kind` reads `429` as a short burst.
- **Messages stay `error: …` and keep their existing prefixes.** Existing tests match `/error: no response from Bitbucket/` (`tests/api.test.ts:218`, `auth-login.test.ts:131`, `auth-status.test.ts:171`, `pr-list.test.ts:804`); the new line still matches that regex, so those tests keep passing — tighten them to assert one line.
- **bash 3.2 only** (AGENTS.md rule 3). `mktemp` + `rm -f` is the existing pattern (`bb_paginate`'s `hdr_file`).
- **Retry loop:** in `bb_paginate`, a 429 retries; a `000` does not (it fails on the first attempt today). Keep that.

### Done when

- No credentials (unset `BB_TOKEN`, a stub `security` that exits 1 first on `PATH`): `bb whoami`, `bb pr list` and `bb api /user` each exit 1 with **exactly one** stderr line naming `bb auth login` and `BB_TOKEN`. Catches the three-line message.
- Closed port: `bb whoami`, `bb api /user`, `bb pr list --all --json`, `bb auth login` each exit 1, print nothing on stdout, and **exactly one** stderr line that starts `error: no response from Bitbucket (` and contains curl's reason (e.g. `Failed to connect`). Catches the leftover curl line and a dropped reason.
- HTTP 401 still: one line, exit 1. HTTP 429 still: exit 75, `rate limited`, no `429`. HTTP 500 still exit 1.
- No temp file left behind (assert the count of files matching the temp prefix, or run with `TMPDIR` set to an empty test directory and check it is empty after the run).

Tests go in `skills/working-with-bitbucket-api/tests/` (`auth-status.test.ts`, `api.test.ts`, plus the existing closed-port helper `tests/closed-port.ts`).

Plus the repo gates: `pnpm test`, `pnpm run validate`, the `bb` suite (`cd skills/working-with-bitbucket-api/tests && pnpm test`) green on Linux and macOS `/bin/bash` 3.2, and a changeset with a `bumps:` block for `working-with-bitbucket-api` (patch). The changeset must say that the error output of every `bb` command changed (credentials and no-response cases), and — the gap the changelog juror found — that `bb auth status` text output changed in #121. Run `node ~/.claude/plugins/cache/plot-marketplace/plot/2.29.0/skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `plot-open-pr.sh` (`--draft` while it moves), never `gh pr create`. Mark it ready only when every check above passes locally: a ready, green, CLEAN PR is merged automatically.
- When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section.

### Scope guard

This branch owns: `bb_token`'s message, the curl-stderr capture at the five call sites, `bb_check_status`'s `000` message, their tests, one changeset.

Not this branch: `bb whoami` output (merged in #121); `--version`/`--help` (merged in #122); `feature/bb-self-check` (plan `bb-install-source`, in flight in parallel — it edits other skills' `SKILL.md` files and `install-dependencies.sh`, not `cli/bb`).

If you find something the plan did not anticipate, report it rather than improvising outside scope.
