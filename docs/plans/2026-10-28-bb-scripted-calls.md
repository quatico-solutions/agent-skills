# `bb` tells a script what happened: rate-limit exit code, `pr list --head`, api path check

> A script that calls `bb` cannot tell a rate limit from any other failure, cannot ask for the PRs of one branch, and gets HTTP 403 for an api path without a leading `/`.

## Status

- **Phase:** Approved
- **Type:** bug
- **Sprint:** bb-cli-hardening
- **Issue:** #111
- **Review:** in-session
- **Impl:** own branches
- **Approved:** 2026-10-28, jwloka, in-session

## Changelog

- `bb` exits with status 4 when Bitbucket still answers HTTP 429 after the last retry, and the error line names the wait Bitbucket asked for.
- `bb pr list --head <branch>` lists the PRs of one source branch in one request; the flag repeats and combines with `--state`.
- `bb api` accepts a path without a leading `/` instead of answering HTTP 403.

## Motivation

#111 records three failures from 2026-10-28 against `bb` 1.12.1 and an account over its hourly API budget.

1. `bb pr list --state merged --all --json > merged.json 2>/dev/null` left an empty file, and the caller read the result as success until `JSONDecodeError`. `bb_paginate` already prints no rows and returns 1 after the fifth retry (`cli/bb:251`), and `cmd_pr_list` exits 1. Exit 1 is also the status of every usage error and every other HTTP error, so a caller cannot tell "wait and retry" from "fix the call". The final line `error: rate limited after <n> rows` does not say how long to wait.
2. Finding the merged PR of a deleted branch took `bb pr list --state merged --all` (3532 PRs in `quatico/ewz-kus-portal`) or a hand-built `bb api '…/pullrequests?q=source.branch.name="…"'`.
3. `bb api 'repositories/…'` answers `HTTP 403 — Forbidden`; `bb api '/repositories/…'` answers 200. `cmd_api` passes the path to `bb_api_call`, which appends it to `https://api.bitbucket.org/2.0` with no separator. The help text says "Paths are relative to https://api.bitbucket.org/2.0", so the slash reads as optional, and the 403 reads as a token-scope problem.

## Design

### Approach

- **Rate-limit exit (`bb_paginate`).** After the last 429, print `error: rate limited after <n> rows (Bitbucket asked to wait <s> s)` when the final response carries `Retry-After`, otherwise the line as today, and return 4. `cmd_pr_list` and every other `bb_paginate` caller pass 4 through instead of collapsing it to 1. Exit 4 means "rate limited" in `bb --help` and in `skills/working-with-bitbucket-api/SKILL.md`. stdout stays empty, and an `--all` walk that stops partway prints no partial array — the existing behaviour, pinned by a test.
- **`pr list --head <branch>`.** Repeatable. Adds `(source.branch.name = "<a>" OR …)` to the `q=` expression in `bb_pr_list_query`, ANDed with the states, authors and `--updated-since`. `--head` forces the `q=` form, like `--author`.
- **`bb api` path.** Prepend `/` when the path does not start with one, after the `{ws}`/`{repo}` substitution. The help line already calls the path relative; refusing it would contradict the help.

### Open Points

- [ ] `bb_api_call` (used by `bb api`, `auth status` and every single-object command) does not retry a 429 at all. Out of scope here; decide whether it gets the `bb_paginate` schedule and exit 4 in a follow-up.
- [ ] #111 says the caller saw success. The code exits 1. Reproduce the original call (`> file 2>/dev/null` from Python) before closing the slice, and record whether the 1 was lost by the caller.

## Slices

### rate-limit exit code (Branch: bug/bb-rate-limit-exit)

- `bug/bb-rate-limit-exit` — exit 4 and `Retry-After` in the final 429 line of `bb_paginate`, passed through by its callers, with cases in `tests/pr-list.test.ts` <!-- builds: exit status 4 for an exhausted 429 in bb_paginate -->

### pr list --head (Branch: feature/bb-pr-list-head)

- `feature/bb-pr-list-head` — repeatable `--head` on `cmd_pr_list`, mapped to `source.branch.name` in `bb_pr_list_query`, with cases in `tests/pr-list.test.ts` <!-- builds: --head on cmd_pr_list -->

### api path slash (Branch: bug/bb-api-path-slash)

- `bug/bb-api-path-slash` — `cmd_api` prepends a missing leading `/`, with cases in `tests/api.test.ts` <!-- builds: leading-slash normalisation in cmd_api -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Follow-up to `bb-paginate-backoff` (v3.18.1), which set the retry schedule and the no-rows-on-failure rule this plan keeps.
- `bb whoami` (#112) and the install source (#113) were split out of #111 into `bb-whoami` and `bb-install-source`.
