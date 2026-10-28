# Juror verdict: Bitbucket Cloud REST API v2 semantics

Plan: `docs/plans/2026-10-28-bb-scripted-calls.md` · Ticket: #111 · Lens: Bitbucket Cloud REST API v2 (BBQL `q=`, 429 and `Retry-After`, URL construction)

Position: amend
Evidence: ran

## What I ran and what I read

- **Ran:** a loopback logging HTTP server on `127.0.0.1:18777`, with `BB_API_URL=http://127.0.0.1:18777/2.0` and `/bin/bash cli/bb -R ws1/repo1 api <path>` for six path forms. Server-side request paths:
  - `/user` → `/2.0/user`
  - `user` → `/2.0user`
  - `{ws}/{repo}` → `/2.0ws1/repo1`
  - `repositories/{ws}/{repo}` → `/2.0repositories/ws1/repo1`
  - `http://127.0.0.1:18777/2.0/user` → `/2.0http://127.0.0.1:18777/2.0/user`
  - `?x=1` → `/2.0?x=1`
- **Ran:** `jq -sRr @uri` on `(state = "MERGED") AND (source.branch.name = "feature/a b\"c")` → `%28state%20%3D%20%22MERGED%22%29%20AND%20%28source.branch.name%20%3D%20%22feature%2Fa%20b%5C%22c%22%29`. Slash, space and quote are all percent-encoded.
- **Read:** `cli/bb:168-191` (`bb_api_call`), `cli/bb:209-275` (`bb_paginate`), `cli/bb:483-523` (`bb_pr_list_query`), `cli/bb:905-930` (`cmd_pr_list`), `cli/bb:2484-2554` (`cmd_api`), `tests/pr-list.test.ts:601-690`, `SKILL.md:159`.
- **Web (checked 2026-10-28):** Atlassian KB "Bitbucket Cloud Rate Limit Troubleshooting", "API request limits" (confluence.atlassian.com/display/BITBUCKET/Rate+limits), the "scaled rate limits" blog post, and the KB article on listing merged PRs by source and destination branch. developer.atlassian.com/cloud/bitbucket/rest/intro/ did not render through WebFetch, so I could not quote the BBQL grammar page directly.

## 1. Does the Motivation hold?

Mostly yes. I checked each claim:

- "`bb_paginate` prints no rows and returns 1 after the fifth retry (`cli/bb:251`)": true. `cli/bb:251-253` prints `error: rate limited after ${rows} rows` and returns 1. The pinning test is `tests/pr-list.test.ts:662-683` (`exitCode, 1`, `stdout ''`).
- "`cmd_pr_list` exits 1": true. `cli/bb:919` and `cli/bb:927` use `|| { …; exit 1; }`.
- "Exit 1 is also the status of every usage error and every other HTTP error": true. `grep 'exit [2-9]'` finds no other exit status in `cli/bb`, so 4 is free.
- "The final line does not say how long to wait": true. The wait value is also lost. On the sixth 429 the loop breaks at `cli/bb:234` before it parses the header, and `cli/bb:248` deletes `$hdr_file` before the message.
- "`cmd_api` passes the path to `bb_api_call`, which appends it with no separator": true (`cli/bb:179`, `"${BB_API}${path}"`). I confirmed it by running the trace above: `user` becomes `/2.0user`.
- The 403 claim (instead of 404) comes from the ticket. I cannot reproduce it without a live call. My reading: `https://api.bitbucket.org/2.0repositories/…` matches no `/2.0/` route, and Bitbucket's edge answers non-API paths with 403. The plan does not depend on why the code is 403, so this does not matter for the fix.
- "#111 says the caller saw success. The code exits 1" (Open Point 2): agreed. `set -euo pipefail` (`cli/bb:3`) plus `|| exit 1` makes exit 1 deterministic. The open point is correct to suspect the caller.

## 2. Does each slice deliver #111's Expected criteria?

**Slice 1 (rate-limit exit):**

- Distinct exit code: delivered.
- One stderr line: delivered.
- Empty stdout: delivered.
- No partial array on a midway `--all` failure: delivered. This is existing behaviour, and the test already pins it.
- "Including how long Bitbucket asked to wait (`Retry-After` when present)": delivered as written, but the API rarely provides it. Bitbucket Cloud documents a rolling one-hour window per endpoint group. The documented rate-limit headers are `X-RateLimit-Limit`, `X-RateLimit-Resource` and `X-RateLimit-NearLimit`. Atlassian support says only workspace, project and repository access tokens receive them. `bb` authenticates with email plus a user API token (`cli/bb:174`). I found no Atlassian statement that a 429 carries `Retry-After`. The code comment at `cli/bb:199` records a measurement of a 429 with no `Retry-After`.
- Effect on the Changelog: in production the line almost always takes the "otherwise as today" branch. The Changelog bullet "the error line names the wait Bitbucket asked for" promises more than the API delivers. This is a wording defect, not a design defect.

**Slice 2 (`--head`):**

- Field, operator and the AND with state are correct BBQL. Atlassian's KB uses `source.branch.name = "…"` in `q=`, and an Atlassian answer decodes `destination.branch.name="release/1.0" AND state="OPEN"`.
- Building the filter inside `bb_pr_list_query` keeps the "q= overrides state=" rule in one place (`cli/bb:472-482`).
- `--head` matches the existing `pr create --head` (`cli/bb:1108`) and gh's flag name.
- Repeatable and combines with `--state`: delivered. A single-branch lookup is one request: delivered.

**Slice 3 (api path):** delivered for relative paths, using the "normalise" option from #111.

## 3. What breaks?

- **`tests/pr-list.test.ts:683`** asserts `exitCode, 1` for an exhausted 429. Slice 1 must change this assertion to 4. The plan says the cases live in `pr-list.test.ts`, but it does not name this test.
- **Other `bb_paginate` callers.** Most callers assign without `||` (`cli/bb:1054`, `1077`, `1902`, `1953`, `2021`, `2084`, `2195`, `2249`, `2320`, `2464`). Under `set -e` (`cli/bb:3`), a failing `x="$(…)"` aborts with the substitution's status, so these callers already pass 4 through with no edit. Three callers do not pass 4:
  - `cli/bb:919` and `cli/bb:927` (`cmd_pr_list`) collapse it to 1. The plan covers these.
  - `cli/bb:141` and `cli/bb:149` (user lookup by display name) use `|| prs="[]"`. A 429 there becomes "user not found". The plan says "every other `bb_paginate` caller passes 4 through", but these two swallow the status entirely, so the plan must decide for them.
- **SKILL.md:159** says "exits non-zero". It stays true, but the slice must update the line to name 4, as the plan says.
- **Bash 3.2:** none of the three changes needs a bash 4 feature. `[[ "$path" == /* ]] || path="/$path"` is 3.2-safe.
- **`bb api` with a full URL** is broken today: the trace shows `/2.0http://…/2.0/user`. Prepending `/` keeps it broken (`/2.0/http://…`). This is not a regression, but the plan's statement that it "accepts a path without a leading `/`" leaves out the most likely no-slash input. A script that follows a `next` link from a `bb api` page gets a full `https://api.bitbucket.org/2.0/…?page=2` URL, and that case hits the same misleading 403 that #111 complains about.
- **`?x=1`** becomes `/2.0/?x=1` after the fix. This is harmless.
- **`{ws}/{repo}` alone** becomes `/2.0/ws1/repo1` after the fix. It is a 404 instead of a 403, which is an improvement. The substitution runs before the prepend, as the plan orders it, so the order is right.

## 4. What is the plan silent about?

1. **The author fallback path.** `cli/bb:922-927` refetches with `bb_pr_list_query "$states" "" "$since"` when `--author` matches nothing. With `--head` added as a fourth argument, the implementer must pass the heads into the fallback call too. Otherwise `--author X --head b` silently widens to all branches when the nickname misses. This is the same failure class the comment at `cli/bb:923-925` warns about.
2. **Escaping in BBQL string literals.** Git allows `"` in a ref name; `\`, space, `~`, `^`, `:`, `?`, `*` and `[` are forbidden. An unescaped `"` breaks the `q=` expression. Bitbucket answers that with HTTP 400, or worse with a different filter. The likely escape is a backslash (`\"` → `%5C%22`), but I could not confirm it in official docs. `--author` has the same gap today (`cli/bb:507`). The plan should either escape `\` and `"`, or reject a `--head` value that contains `"`.
3. **The default state with `--head`.** `--head` alone still defaults to `OPEN` (`cli/bb:903`). #111's own use case, the merged PR of a deleted branch, then needs `--state merged`. Either keep the default and document it in help and SKILL.md, or default to all four states when `--head` is given (as gh does not). Either way the plan must state which.
4. **Exact match.** `=` is exact and case-sensitive. A `--head feature/` prefix needs `~`. The plan should say exact, so the help text does not imply a pattern.
5. **Which wait to print.** The loop caps `Retry-After` at 60 (`cli/bb:239`). On the final 429 it does not parse the header at all. The implementer must read `$hdr_file` before `rm -f` at `cli/bb:248`, and must decide between the raw value and the capped value, and between seconds and an HTTP-date (RFC 9110 allows both). The plan says "the wait Bitbucket asked for", which implies the raw value. It should say whether a non-integer value is printed verbatim or dropped.
6. **The Open Point "bb_api_call does not retry a 429".** This also means `bb api` and every single-object command return exit 1 on a rate limit. A script cannot use 4 reliably until the follow-up lands. The help and SKILL.md wording for exit 4 should scope it to listings, or a caller will read exit 4 as the contract for all of `bb`.

## 5. Position and the smallest amendment that changes it

**Position: amend.** All three slices are correct against the Bitbucket API, and none breaks an existing caller beyond the one intended test change. The plan still leaves two choices to the implementer that can return a plausible wrong answer: the fallback that drops `--head`, and BBQL quoting. It also promises a `Retry-After` value that Bitbucket does not document sending.

The smallest amendment that would move me to proceed:

- (a) Slice 2: "`--head` values travel into both `bb_pr_list_query` calls, including the author fallback. `\` and `"` are backslash-escaped, or a value containing `"` is refused."
- (b) Slice 1 and the Changelog: "names the wait when Bitbucket sends a numeric `Retry-After`. Bitbucket does not document this header and usually omits it." Name the uncapped value, and state that exit 4 covers paged listings only until the `bb_api_call` follow-up.
- (c) Slice 3: either strip a leading `${BB_API}` prefix so a full `next` URL works, or refuse `http*` paths with a local error. Do not leave full URLs producing a 403.

## Findings by severity

1. **Medium:** the `--author` fallback (`cli/bb:926`) drops `--head` unless the plan names it. Result: a silently widened list.
2. **Medium:** a BBQL string is built without escaping (`"` in a branch name). Also latent in `--author`.
3. **Medium:** `Retry-After` is not a documented Bitbucket 429 header. Bitbucket's limit is a rolling hour, and the 62 s retry budget cannot outlast it. The Changelog overpromises, and exit 4 is the part that actually helps.
4. **Low:** full-URL input to `bb api` stays broken after "prepend /" (ran: `/2.0/http://…`).
5. **Low:** `cli/bb:141` and `cli/bb:149` swallow the 429 status, which contradicts "every other caller passes 4 through".
6. **Low:** the default state `OPEN` with `--head` is not stated, and #111's use case needs `--state merged`.
7. **Info:** `tests/pr-list.test.ts:683` changes from 1 to 4. This is an intended contract change, and the changeset should call it out.

Sources: [Bitbucket Cloud Rate Limit Troubleshooting](https://support.atlassian.com/bitbucket-cloud/kb/bitbucket-cloud-rate-limit-troubleshooting/), [API request limits](https://confluence.atlassian.com/display/BITBUCKET/Rate+limits), [Scaled rate limits](https://www.atlassian.com/blog/bitbucket/introducing-scaled-rate-limits-for-bitbucket-cloud-api), [Merged PRs by source/destination branch](https://support.atlassian.com/bitbucket-cloud/kb/using-bitbucket-rest-api-to-get-list-of-merged-pull-requests-for-a-specific-source-and-destination-branches/).
