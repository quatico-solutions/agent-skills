# `bb` tells a script what happened: no false success, rate-limit exit code, `pr list --head`, api path check

> A script that calls `bb` can read success from a call that never reached Bitbucket, cannot tell a rate limit from any other failure, cannot ask for the PRs of one branch, and gets HTTP 403 for an api path without a leading `/`.

## Status

- **Phase:** Released
- **Type:** bug
- **Sprint:** bb-cli-hardening
- **Issue:** #111
- **Review:** in-session
- **Impl:** own branches
- **Rounds:** 1
- **Approved:** 2026-10-28, jwloka, in-session
- **Started:** 2026-10-28, Jan Wloka, `bug/bb-transport-failure`
- **Started:** 2026-10-28, Jan Wloka, `bug/bb-rate-limit-exit`
- **Started:** 2026-10-28, Jan Wloka, `feature/bb-pr-list-head`
- **Started:** 2026-10-28, Jan Wloka, `bug/bb-api-path-slash`
- **Delivered:** 2026-10-28
- **Released:** 2026-10-29, v3.19.0

## Changelog

- `bb` exits non-zero when a request gets no HTTP answer, for example when it cannot connect. It no longer prints `[]` and exits 0.
- `bb` exits with status 75 when Bitbucket answers HTTP 429: paged listings after their last retry, every other command on the first 429. The error line says `rate limited`, and names the wait when Bitbucket sends `Retry-After`.
- `bb pr list --head <branch>` lists the PRs of one source branch in one request; the flag repeats and combines with `--state` and `--author`.
- `bb api` accepts a path without a leading `/`, and a full `https://api.bitbucket.org/2.0/…` URL, instead of answering HTTP 403.

## Motivation

#111 records three failures from 2026-10-28 against `bb` 1.12.1 and an account over its hourly API budget. Panel round 1 (`.plot/panels/2026-10-28-bb-scripted-calls/panel.md`) reproduced each and found a fourth.

1. **The incident.** `bb pr list --state merged --all --json > merged.json 2>/dev/null` left an empty file, and a Python caller failed later on `JSONDecodeError`. The installed tap binary is byte-identical to `cli/bb`. Against an always-429 server it exits 1 and writes nothing; Python `subprocess.run` without `check=True` ignores the 1. The caller dropped the status. A rate limit still exits 1, the status of every usage error and every other HTTP error, so a caller that does check it cannot tell "wait" from "fix the call".
2. **False success.** With nothing listening on the API port, `bb pr list --all --json` prints `[]` and exits 0. curl reports status 7, the HTTP status reads `000`, and `[[ 000 -ge 400 ]]` is false in `bb_paginate`, `bb_api_call` and `bb_api_raw`. This is the "looks like success" failure #111 describes, and no exit code fixes it.
3. **No branch filter.** Finding the merged PR of a deleted branch took `bb pr list --state merged --all` (3532 PRs in `quatico/ewz-kus-portal`) or a hand-built `bb api '…/pullrequests?q=source.branch.name="…"'`.
4. **api path.** `bb api 'repositories/…'` requests `…/2.0repositories/…` and answers `HTTP 403 — Forbidden`. A full `next` URL becomes `…/2.0https://api.bitbucket.org/2.0/…`. The help text says "Paths are relative to https://api.bitbucket.org/2.0", so the slash reads as optional.

## Design

### Approach

- **Only a 2xx is success.** In `bb_paginate`, `bb_api_call` and `bb_api_raw`, a status that is not `2xx` fails, `000` included: one stderr line (`error: no response from Bitbucket` for `000`) and exit 1. `skills/working-with-bitbucket-api/SKILL.md` tells script authors to check `bb`'s exit status or set `set -o pipefail` — the change that would have prevented #111's incident.
- **Exit 75 means rate limited.** 75 is `EX_TEMPFAIL` in `sysexits.h`: temporary failure, try again later. 4 was rejected: gh uses it for "authentication required", and Plot reads 4 as "cannot be asked, do not retry" for the `bb` exit codes it passes through (`pr merge`, `pr create`, `pr edit`).
  - `bb_paginate` returns 75 after its last retry. `bb_api_call` and `bb_api_raw` return 75 on the first 429, with no retry; retrying them is a follow-up.
  - Call sites that collapse the status: `cmd_pr_list` (`cli/bb:919`, `:927`) and `download list` (`cli/bb:2651`) pass the callee's status through instead of `exit 1`. `bb_resolve_user` (`cli/bb:141`, `:149`) passes 75 through instead of reporting "cannot resolve reviewer". The ten bare `result="$(…)"` call sites already pass it through under `set -euo pipefail` (probed on `/bin/bash` 3.2.57).
  - Final line: `error: rate limited after <n> rows` for listings, `error: rate limited` otherwise, plus ` — Bitbucket asked to wait <s> s` only when the final response carries `Retry-After`. `<s>` is the header value uncapped, read before `hdr_file` is removed. The line never contains `429`: Plot's `host_failure_kind` reads `429` as a short burst and `rate limit` as a spent quota.
  - `bb --help` lists the exit codes: 0 success, 1 error, 75 rate limited, and jq's own codes under `--jq`.
- **`pr list --head <branch>`.** Repeatable. Adds `(source.branch.name = "<a>" OR …)` to the `q=` expression in `bb_pr_list_query`, ANDed with states, authors and `--updated-since`; `--head` forces the `q=` form, like `--author`. Both `bb_pr_list_query` calls pass the heads, including the zero-row author refetch (`cli/bb:924`–`927`). A branch name containing `"` is refused with a usage error, because Bitbucket's escape rule for BBQL strings is undocumented. The help example for #111's case: `bb pr list --head <branch> --state merged`.
- **`bb api` path.** After the `{ws}`/`{repo}` substitution: strip a leading `https://api.bitbucket.org/2.0` (or `$BB_API`), then prepend `/` when the path does not start with one. Any other `http://` or `https://` URL is refused locally, so the token never travels to another host.

### Open Points

- [x] Reproduce #111's original call. Done in panel round 1: the released binary exits 1; the caller ignored it.
- [ ] `bb_api_call` and `bb_api_raw` exit 75 on a 429 without retrying. Decide in a follow-up whether they get the `bb_paginate` retry schedule.
- [ ] `--author` has the same unescaped `"` gap as `--head`. Out of scope; same refusal would fit.

## Slices

### no false success (Branch: bug/bb-transport-failure)

- `bug/bb-transport-failure` — `bb_paginate`, `bb_api_call` and `bb_api_raw` fail on any non-2xx status including `000`; exit-status guidance in `SKILL.md`; cases for a closed port in `tests/pr-list.test.ts` and `tests/api.test.ts` → #117 <!-- builds: non-2xx-is-failure check in bb_paginate, bb_api_call and bb_api_raw -->

### rate-limit exit code (Branch: bug/bb-rate-limit-exit) <!-- waits: bug/bb-transport-failure -->

- `bug/bb-rate-limit-exit` — exit 75 on 429 in `bb_paginate`, `bb_api_call` and `bb_api_raw`, passed through at `cli/bb:141`, `:149`, `:919`, `:927`, `:2651`; final line with uncapped `Retry-After`; exit codes in `bb --help` and `SKILL.md`; `tests/pr-list.test.ts:677` changes from 1 to 75 → #119 <!-- builds: exit status 75 for HTTP 429 -->

### pr list --head (Branch: feature/bb-pr-list-head) <!-- waits: bug/bb-rate-limit-exit -->

- `feature/bb-pr-list-head` — repeatable `--head` on `cmd_pr_list`, passed into both `bb_pr_list_query` calls, `"` refused, with cases in `tests/pr-list.test.ts` (alone, with `--state`, with `--author` matching nothing) → #120 <!-- builds: --head on cmd_pr_list -->

### api path (Branch: bug/bb-api-path-slash)

- `bug/bb-api-path-slash` — `cmd_api` strips the API base URL, prepends a missing `/`, refuses other hosts, with cases in `tests/api.test.ts` → #123 <!-- builds: path normalisation in cmd_api -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific — one per slice branch
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Follow-up to `bb-paginate-backoff` (v3.18.1), which set the retry schedule and the no-rows-on-failure rule this plan keeps.
- `bb whoami` (#112) and the install source (#113) were split out of #111 into `bb-whoami` and `bb-install-source`.
- #111 suggests exit 4; this plan uses 75 for the reasons under Approach.
- Slices 1–3 edit `cmd_pr_list`, `tests/pr-list.test.ts` and `SKILL.md`, so they land in order. The api-path slice touches only `cmd_api` and runs in parallel.
