# Implementation brief — bb-pr-merge-match-head

- **Plan (canonical):** `docs/plans/2026-10-23-bb-pr-merge-match-head.md` on `main`
- **Approved:** 2026-10-23, jwloka, in-session
- **Branch:** `feature/bb-pr-merge-match-head` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`. Do not merge it yourself.
- **Review of the code:** normal PR review; CI runs `ci.yml` and `bb-tests.yml` (Linux **and** macOS with `/bin/bash` 3.2)
- **Sprint:** `bb-pr-reads` (2026-10-26 to 2026-10-30), Could Have — it does not gate release 3.18.0

One slice, one wave. Nothing waits on it. Two other branches change `cli/bb` at the same time; see the scope guard.

## What to build

`bb pr merge <id>` merges whatever the PR's head is when the request arrives (issue #100). `gh pr merge --match-head-commit <sha>` refuses a PR that moved after review; `bb` has no equivalent, so callers check the head by hand first.

Add `--match-head-commit <sha>` to `cmd_pr_merge` (`cli/bb:1554`):

1. Validate the pin before any request: lowercase, 7 or more hex digits, else a usage error.
2. `bb_api_call GET "/repositories/${ws}/${repo}/pullrequests/${pr_id}"` and read `.source.commit.hash`.
3. Compare (rule below). On a mismatch, exit 1 with `error: head moved — PR #<id> is at <head>, expected <sha>; nothing was merged`, and send no `POST`.
4. On a match, send the existing merge `POST` unchanged.
5. Help text of `pr merge`, and the `pr merge` section of `skills/working-with-bitbucket-api/SKILL.md`, including the race below.

Without the flag, `cmd_pr_merge` behaves exactly as today: no `GET` before the `POST`. The plan is canonical; this brief is orientation.

## Decisions the plan settles — do not re-derive them

**Prefix match in both directions, not equality.** Bitbucket returns a 12-character `source.commit.hash` — `35ed68c05967` for `quatico/ewz-kus-portal` PR 3712, measured 2026-10-23. A caller pinning a 40-character SHA from `git rev-parse` must match it, so equality would refuse every full SHA. Lowercase both values; both must be 7 or more hex digits; they match when either is a prefix of the other.

**Copy plot's rule, do not invent one.** `plot-host.sh pr-merge --match-head` (plot 2.28.0, line 4125) already checks Bitbucket merges this way: `[[ "$head_l" == "$pin_l"* ]] || [[ "$pin_l" == "$head_l"* ]]`, both values matched against `^[0-9a-f]{7,}$`. When plot later passes the pin to `bb`, the two must give the same answer; a different minimum length or a one-way prefix makes them disagree.

**The read–merge gap stays open, and the docs say so.** Bitbucket's merge endpoint takes no expected head, so a push between the `GET` and the `POST` is merged. There is **no post-merge check**: it could only report a merge that already happened, and the operator decided against it. Write the race into the help text and SKILL.md instead.

**A malformed pin fails before the `GET`.** A 6-character or non-hex pin is a usage error with no request at all, so a typo never costs a round trip and never reaches the merge.

**Rules this repo keeps re-learning:**
- Bash 3.2: no `${var,,}` for lowercasing — use `tr '[:upper:]' '[:lower:]'`, as plot does. No `declare -A`, no `mapfile`; under `set -u`, expand a possibly-empty array as `${arr[@]+"${arr[@]}"}` (AGENTS.md Critical Rule 3).
- `bb_api_call` already prints `error: HTTP <code> — <message>` and returns 1 on any HTTP error; a failed `GET` must stop the merge, so check its exit status rather than an empty result.

## Done when

The plan's `### Verification` section is the specification. In `tests/pr-merge.test.ts`:

- a matching 12-character pin: `GET` then merge `POST`
- a 40-character pin whose first 12 characters equal the head: `POST` sent — catches an equality comparison
- an uppercase pin that matches: `POST` sent — catches a missing lowercase step
- a mismatch: exit 1, stderr `head moved`, **no `POST` recorded** — assert the mock server's calls, not only the exit code; a check that prints the error and merges anyway passes an exit-code test
- a 6-character pin and a non-hex pin: usage error, **no request recorded at all**
- no flag: exactly one call, the `POST` — catches a `GET` added to every merge

**Live check, read-only:** only against `quatico/ewz-kus-portal` PR 3712, which is already MERGED, so Bitbucket refuses a merge even if the check were broken. From this branch's `cli/bb` (not the `bb` on `PATH`), once before the PR is marked ready; paste the output into the PR description:

- `bb -R quatico/ewz-kus-portal pr view 3712 --json | jq -r .source.commit.hash` prints a 12-character hash
- `bb -R quatico/ewz-kus-portal pr merge 3712 --match-head-commit 0000000` exits 1 with `head moved`

**Merge no other PR, live, anywhere.**

Plus the repo gates (AGENTS.md § Definition of Done): `pnpm test`, `pnpm run validate`, and `(cd skills/working-with-bitbucket-api/tests && pnpm test)`. Run all three before each push. Add a changeset (`pnpm changeset`): root `minor`, `bumps:` → `working-with-bitbucket-api: minor`; indent `tuned-against:` by exactly two spaces if you add it. **Do not edit `BB_VERSION` in `cli/bb`** — the release commit bumps it.

## Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-open-pr.sh` (`--draft` while the work moves). Do not run `gh pr create`.
- When the PR exists, append `→ #<number>` to this branch's heading line in the plan's `## Slices` section.
- Commit style is Arlo's notation (`F - …`), per `skills/commit-notation/SKILL.md`.

## Scope guard

This branch owns `cmd_pr_merge` in `cli/bb`, `tests/pr-merge.test.ts`, the `pr merge` part of `skills/working-with-bitbucket-api/SKILL.md`, and one changeset.

In flight at dispatch (2026-10-23):
- `bug/bb-pr-view-json-fields` (PR #101) owns `cmd_pr_view`, `tests/pr-view.test.ts` and the `pr view` part of `SKILL.md`.
- `feature/bb-pr-list-pagination` owns `bb_paginate`, `bb_pr_list_query`, `cmd_pr_list`, `tests/pr-list.test.ts` and `tests/.build/dev/mock-server.ts`.

Do not touch those. All three branches edit `cli/bb` and `SKILL.md` in different functions and sections; whichever PR merges later rebases.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
