# Juror verdict: implementer and test suite

Plan: `docs/plans/2026-10-28-bb-scripted-calls.md` · Ticket: #111 · Lens: implementer who takes one slice at a time and must pass on Linux and macOS `/bin/bash` 3.2.

Position: amend
Evidence: ran

## What I ran

- `node --import tsx --test pr-list.test.ts api.test.ts download.test.ts` in `skills/working-with-bitbucket-api/tests`: 62 pass, 0 fail (baseline on main). Local `bash` resolves to `/opt/homebrew/bin/bash` (5.x), not 3.2; CI pins 3.2 via PATH (`.github/workflows/bb-tests.yml:163`).
- `/bin/bash` 3.2.57 probes of the exit-status paths under `set -euo pipefail`, with `f() { return 4; }`:
  - `r="$(f)"` with no guard → process exits **4**.
  - `r="$(f)" || { exit 1; }` → exits **1** (status collapsed).
  - `local r="$(f)"` → **continues, exit 0** (masked; no current call site does this).
  - `r="$(f)" || { local rc=$?; …; exit $rc; }` → exits **4**. This pattern is bash 3.2-safe.

Everything else below was read, not run.

## 1. Motivation against code and ticket

The Motivation holds.

- `bb_paginate` prints no rows and returns 1 after the fifth retry: `cli/bb:248-253` (`echo >&2 "error: rate limited after ${rows} rows"; return 1`). The plan cites `cli/bb:251`, which is correct.
- `cmd_pr_list` collapses the status to 1: `cli/bb:919` and `cli/bb:927` (`|| { rm -f "$next_file"; exit 1; }`).
- `BB_VERSION="1.12.1"` (`cli/bb:5`) was set by `43600bc release: 3.18.1`, the release that shipped the backoff. The reporter's 1.12.1 therefore exited 1, not 0. Open Point 2 ("the 1 was lost by the caller") is the right reading.
- `bb_api_call` concatenates `${BB_API}${path}` with no separator (`cli/bb:179`). `cmd_api` passes the path through after `{ws}`/`{repo}` substitution (`cli/bb:2531-2544`). The help says "Paths are relative to https://api.bitbucket.org/2.0" (`cli/bb:2492`).
- `bb_api_call` has no 429 retry (`cli/bb:168-191`). The Open Point records this correctly.

## 2. Slices against #111 "Expected"

- **Slice 1 (exit 4).** It covers exit 4, one error line, `Retry-After`, empty stdout, and non-zero on a partial `--all` walk. The plan weakens one criterion: "every other `bb_paginate` caller passes 4 through" is not true of the code as it stands, and the slice names only `tests/pr-list.test.ts`. Of the 16 call sites:
  - 10 call sites propagate 4 already, with no change, because their assignment is unguarded under `set -e`: `cli/bb:1054, 1077, 1902, 1953, 2021, 2084, 2195, 2249, 2320, 2464`.
  - 3 call sites collapse 4 to 1 and must change: `cli/bb:919, 927` (`cmd_pr_list`, main fetch and author fallback) and `cli/bb:2651` (`cmd_download_list`).
  - 2 call sites **swallow** the 429 entirely: `cli/bb:141` and `cli/bb:149` (`bb_resolve_user`, `|| prs="[]"`). These two then print `error: cannot resolve reviewer` and exit 1 via `cli/bb:1175` and `cli/bb:1321` (`|| exit 1`). A rate-limited `pr create --reviewer "Display Name"` therefore reports a wrong cause. The plan does not mention this path.
- **Slice 2 (`--head`).** It covers the repeatable flag, `source.branch.name`, the combination with `--state`, and one request. The slice leaves out the author fallback. `cli/bb:926` re-queries with `bb_pr_list_query "$states" "" "$since"`. Once `--head` exists, that call drops the head filter as well. `--head x --author "Display Name"` with an empty nickname match then refetches **every** PR in the states and filters only by display name. The result is wrong and silent, and it is the defect class that the comment at `cli/bb:921-924` warns against.
- **Slice 3 (api slash).** It covers the "normalise" option of #111. The slice is complete as written.

## 3. What breaks

- **Existing test fails by design.** `pr-list.test.ts` "Fails after 5 retries and prints no rows" asserts `result.exitCode, 1`. Slice 1 must change it to 4. The plan says the behaviour is "pinned by a test" but does not say that the existing pin changes. The `SKILL.md:159` sentence "exits non-zero" stays true but needs the code.
- **Exit-code contract.** Exit 4 is new. No other `exit [2-9]` exists in `cli/bb`, so nothing collides. A caller that tests `[ $? -eq 1 ]` for errors changes behaviour. That risk is small, and the changeset must name it.
- **Final `Retry-After` is available.** `curl -D "$hdr_file"` truncates the file on every attempt (`cli/bb:228`). After the loop breaks on the fifth 429, the file holds that response's headers. However, `cli/bb:250` runs `rm -f "$hdr_file"` **before** the 429 branch. The implementer must read the header before that `rm`. The in-loop `wait_s` is capped at 60 (`cli/bb:239`), so reusing it would report 60 s for an hourly budget. The final line must read the raw header again.
- **bash 3.2.** None of the three slices needs a bash 4 feature. The status capture pattern above works on 3.2. `--head` parsing must follow the `--author` pattern (newline-delimited string, `bb_str_contains_line`), not an array.
- **Unguarded `$2`.** `--head` as the last argument under `set -u` aborts with a bash "unbound variable" message. The same defect exists in `--author` and `--state`. `--updated-since` uses `${2:-}` (`cli/bb:856`).

## 4. Decisions the plan leaves to the implementer

1. **Reviewer resolution on 429** (`cli/bb:141, 149, 1175, 1321`): pass 4 through, or leave it as exit 1 and out of scope?
2. **Which `Retry-After` value** goes in the final line: the raw header (for example 3600) or the 60 s cap? A non-numeric value, such as an HTTP-date, is also possible. `cli/bb:238` treats a non-numeric value as absent.
3. **Clause order in `q=`** for `--head`: states, authors, heads, `updated_on`, or another order? Tests compare the exact string (`pr-list.test.ts` "Combines --updated-since with --author"), so the order must be fixed.
4. **The `bb_pr_list_query` signature.** The function takes positional args `states authors since` (`cli/bb:484`). A fourth arg for heads changes both call sites, and the fallback at `:926` must keep the heads.
5. **Quoting in branch names.** Git allows `"` in a ref name, and `--author` has the same gap today. The plan does not say whether to escape the value or reject it.
6. **`bb api` with an absolute URL or an empty path after flags.** Prepending `/` turns `https://…` into `/https://…`. This input is broken today too, so it only needs a sentence in the plan.
7. **Where exit 4 is documented.** The plan names "`bb --help`", but the global help has no exit-status section today. The implementer must decide whether to add one, or to use the `pr list --help` text instead.

## 5. Slice conflicts as parallel branches

The plan says "Impl: own branches". Slices 1 and 2 conflict for certain if they branch from main together:

- `cmd_pr_list`: slice 1 edits `:919` and `:927`, and slice 2 edits `:915` and `:926`. The edited lines are 1 to 4 lines apart, inside one diff hunk.
- `tests/pr-list.test.ts`: both slices append to the end of the `paging` describe block (`:680-693`).
- `SKILL.md`: both slices edit the `pr list` and rate-limit text.

Slice 3 touches only `cmd_api`, `api.test.ts` and possibly one line of `SKILL.md`, so it is independent. The order must be stated: slice 1, then slice 2 rebased on it, or the reverse.

## Test cases each slice needs that the plan does not list

The mock server can express every case below. `stubSequence` repeats its last step and sets per-step headers (`.build/dev/mock-server.ts:82-86`), and `getCalls()` exposes the decoded `query.q`.

**Slice 1**
- Final 429 carries `Retry-After: 3600`: exit 4, stdout empty, stderr matches `asked to wait 3600 s`. This proves the raw value is used, not the 60 s cap.
- Final 429 without `Retry-After`: exit 4 and the existing line.
- Update the existing "Fails after 5 retries" test from 1 to 4.
- Author fallback refetch (`:927`) answers 429: exit 4.
- `bb download list` with a 429: exit 4, in `download.test.ts`, which the plan does not name.
- One unguarded caller, for example `source branches`: exit 4. This guards against a later `|| exit 1`.
- If decision 1 is "pass through": `pr create --reviewer "Name"` with a 429 exits 4.

**Slice 2**
- `--head a`: exact `q` = `(state = "OPEN") AND (source.branch.name = "a")`, no `state=` param, one call.
- `--head a --head b`: OR group. A repeated identical head is deduplicated.
- `--head` with `--state merged --state declined`, with `--author`, and with `--updated-since`: exact `q`.
- `--head x --author "Display Name"`, nickname empty: the fallback refetch `q` still contains `source.branch.name`.
- `--head` with no value: an error message, not a bash `unbound variable`.
- `--help` documents `--head`.

**Slice 3**
- `bb api repositories/testws/testrepo`: the recorded call path is `/repositories/testws/testrepo`. Without the fix the mock records nothing, because `/mockbbrepositories…` misses the `/mockbb/*splat` route. The test therefore fails red before the fix.
- `bb api '{ws}/{repo}/pullrequests'`: substitution plus slash.
- `bb api /user`: unchanged, with no double slash.
- The `?query` is preserved.

## Definition of Done

- The plan lists a changeset but does not say whether each branch adds its own. AGENTS.md Rule 2 and `docs/rules/versioning.md` require one per skill-touching change. Three branches therefore need three changesets, or one shared changeset added in a fixed order.
- The local `pnpm test` runs Homebrew bash 5. The implementer needs `PATH=/bin:$PATH` for the run, or must rely on the macOS CI job, to meet the 3.2 half of the bb DoD item.

## Findings by severity

1. **High: `--head` is lost in the author fallback** (`cli/bb:926`). The fallback produces a wrong, silent result. Slice 2 must pass heads to the fallback query and test it.
2. **High: the exit-4 claim "every other caller" misses `bb_resolve_user`** (`cli/bb:141, 149` swallow; `:1175, :1321` collapse) **and `cmd_download_list`** (`:2651`). The plan must name these call sites or scope them out explicitly.
3. **Medium: the final `Retry-After` must be read before `rm -f "$hdr_file"`** (`cli/bb:250`) **and must be the raw value, not the capped `wait_s`.** The plan text "the wait Bitbucket asked for" implies the raw value, but a test with a value above 60 is the only check.
4. **Medium: slices 1 and 2 conflict as parallel branches** in `cmd_pr_list`, `pr-list.test.ts` and `SKILL.md`. The plan must state the order.
5. **Low: an existing test changes from 1 to 4**, which the plan does not say. Changeset ownership per branch is also unstated. The `q=` clause order is unstated. `$2` is unguarded under `set -u`.

## Smallest amendment that would change my position to proceed

Add three lines to the plan:

- Slice 1 lists the call sites to change: `cli/bb:919, 927, 2651`. It also states the decision for `bb_resolve_user` (`:141, 149, 1175, 1321`). The final line prints the raw `Retry-After`, read before `hdr_file` is removed.
- Slice 2 passes `--head` to both `bb_pr_list_query` calls, including the author fallback at `:926`, and fixes the clause order as states, authors, heads, `updated_on`.
- The Slices section orders slice 1 before slice 2, which rebases on it, and gives one changeset per branch.
