# `bb` paged listings wait out Bitbucket's rate limit

> `bb pr list --all` on a repository with 3519 merged PRs fails with `rate limited after 50 rows`: three retries over 7 seconds are too short for Bitbucket's throttling.

## Status

- **Phase:** Delivered
- **Type:** bug
- **Review:** in-session
- **Impl:** same branch
- **Approved:** 2026-10-24, jwloka, in-session
- **Started:** 2026-10-24, jwloka, `bug/bb-paginate-backoff`
- **Delivered:** 2026-10-24

## Changelog

- Paged `bb` listings retry a page that answers HTTP 429 up to 5 times, waiting 2, 4, 8, 16 and 32 seconds (or `Retry-After`, at most 60 seconds), and print each wait on stderr.

## Motivation

PR #103 shipped `--all` with its live check failing: on 2026-10-23, `bb pr list --state merged --all` on `quatico/ewz-kus-portal` got HTTP 429 on page 2 and again after the 1 s, 2 s and 4 s retries, so it exited with `error: rate limited after 50 rows`.

Measured 2026-10-24 against the same endpoint, three authenticated requests in a row answered `429 200 429`, with no `Retry-After` and no rate-limit headers. Bitbucket throttles bursts rather than a long window, so a longer wait between attempts lets a listing continue. 3519 rows at 50 per page is 71 requests.

## Design

### Approach

- In `bb_paginate` (`cli/bb`), retry a 429 up to 5 times instead of 3.
- Wait `Retry-After` seconds when Bitbucket sends a number, capped at 60. Otherwise wait `2^(attempt+1)` seconds: 2, 4, 8, 16, 32 — 62 seconds in the worst case for one page. `BB_RETRY_BASE_MS` keeps scaling the computed wait, and `0` still skips the sleep.
- Before each wait, print `bb: rate limited, retrying in <n> s (<k>/5)` on stderr. A silent wait of up to a minute reads as a hang; the line also lets the tests check the schedule without sleeping, because it names the wait even when `BB_RETRY_BASE_MS=0` skips it.
- Everything else stays: other non-2xx answers fail on the first attempt, and after the last retry the call exits with `error: rate limited after <n> rows` and prints no rows.
- Update the comment above `bb_paginate` and the 429 sentence in `skills/working-with-bitbucket-api/SKILL.md`.

### Verification

- **Mock suite (`tests/pr-list.test.ts`):** exhaustion now takes 1 + 6 requests; a 429 without `Retry-After` logs waits 2, 4, 8, 16, 32 in order; `Retry-After: 120` logs a wait of 60; `Retry-After: 0` logs 0.
- **Live check, read-only:** `bb -R quatico/ewz-kus-portal pr list --state merged --all --json number --jq length` prints more than 3000, from this branch's `cli/bb`. Paste the output, including any retry lines, into the PR description.

## Slices

### paginate backoff (Branch: bug/bb-paginate-backoff, PR: #106)

- `bug/bb-paginate-backoff` — longer 429 backoff, `Retry-After` cap and a stderr line per retry in `bb_paginate`, with cases in `tests/pr-list.test.ts` <!-- builds: 429 backoff schedule and retry notice in bb_paginate -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Follow-up to `bb-pr-list-pagination` (#98, PR #103), whose `--all` live check failed. That plan's open point on the 50-row cap was ticked without a reproduction and is reopened there.
