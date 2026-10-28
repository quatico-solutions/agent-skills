# Juror verdict: root cause and scope

Position: amend
Evidence: ran

Lens: root cause and scope. What I ran is marked **[ran]**, what I only read is marked **[read]**.

## 1. Does the Motivation hold?

- **Version.** The released `bb` 1.12.1 is the code under change. `BB_VERSION="1.12.1"` was set in `43600bc release: 3.18.1` (2026-10-24) **[read]**. `git diff v3.18.1 HEAD -- cli/bb` is empty **[ran]**. The local tap install `/opt/homebrew/Cellar/quatico-bb/1.12.1/bin/bb` is byte-identical to `cli/bb` (`diff` → no output), and `brew info` reports `quatico-solutions/tap/quatico-bb: stable 1.12.1` **[ran]**.
- **"The code already exits 1."** True. The claim holds at `cli/bb:251-253` (`return 1` after `error: rate limited after ${rows} rows`) and at `cli/bb:919` (`|| { …; exit 1; }`) **[read]**. Against an always-429 loopback server, the exact call from #111 (`bb -R ws/repo pr list --state merged --all --json > merged.json 2>/dev/null; echo $?`) gives `exit=1` and a 0-byte file **[ran]**. The existing test `pr-list.test.ts:676` already pins `exitCode 1`, empty stdout, and no partial array for an `--all` walk that fails partway.
- **Where the "success" came from.** The caller lost the status. `subprocess.run([...], capture_output=True)` without `check=True` returns `returncode 1 stdout ''`, and `json.loads` then raises `JSONDecodeError: Expecting value: line 1 column 1 (char 0)`. That is the exact error in #111 **[ran]**. A pipe without `pipefail` (`bb … 2>/dev/null | jq length`) exits 0 and prints nothing **[ran]**. So exit 4 alone would not have prevented the incident. A caller that ignores status 1 also ignores status 4. The plan's Motivation already says this ("Exit 1 is also the status of every usage error…"). The plan's second Open Point asks for exactly this reproduction, and the evidence above answers it.
- **"The final line does not say how long to wait."** True (`cli/bb:252`) **[read]**.
- **Claim 3 (api path).** True. `cmd_api` passes `$path` to `bb_api_call`, and `bb_api_call` builds `"${BB_API}${path}"` with no separator (`cli/bb:178`, `cli/bb:2540-2548`) **[read]**.
- **Claim 2 (no `--head`).** True. `bb_pr_list_query` (`cli/bb:483-522`) knows only states, authors and since **[read]**.

## 2. Does each slice deliver #111's "Expected"?

- **Item 1.** Delivered for paged listings: a distinct code (4), one stderr line with `Retry-After`, empty stdout, and no partial array (already true, pinned by a test). One criterion is weakened. The plan documents "Exit 4 means rate limited" in `bb --help` and in SKILL.md, but `bb_api_call` and `bb_api_raw` still map HTTP 429 to exit 1. Against the 429 server, `bb api /repositories/ws/repo/pullrequests` prints `error: HTTP 429 — rate` and exits 1 **[ran]**. So the new contract is false for `bb api`, `pr view`, `pr merge`, `pr diff`, `source cat`, and every other single-request command.
- **Item 2.** Delivered: repeatable, `source.branch.name`, combined with `--state`, one request.
- **Item 3.** Delivered by normalisation, one of the two options the ticket allows.
- **Nothing dropped from the bitten path.** The stderr lines quoted in #111 (`bb: rate limited, retrying in 2 s (1/5)`) are `bb_paginate`'s format (`cli/bb:243`), and the `bb api` failure in #111 was a 403, not a 429. The deferred `bb_api_call` retry is therefore not the part that hurt the reporter. Deferring the *retry* is defensible. Deferring the *exit code* is not, because the plan publishes a code that half the commands do not honour.

## 3. What breaks?

- `pr-list.test.ts:676` asserts `exitCode 1` for the exhausted walk. It must change to 4. This is intended.
- Callers that collapse status: `cli/bb:919` and `cli/bb:927` (`exit 1`) need to change. This is named in the slice.
- Callers that swallow status: `bb_resolve_user` (`cli/bb:141`, `cli/bb:149`) does `|| prs="[]"`. Under a rate limit, `pr create --reviewer` and `pr edit --reviewer` therefore report `cannot resolve reviewer` and exit 1 **[read]**. This contradicts the plan's "every other `bb_paginate` caller pass 4 through" unless the slice touches it.
- The other callers (`cli/bb:1054, 1077, 1902, 1953, 2021, 2084, 2195, 2249`) use a bare `result="$(bb_paginate …)"` under `set -euo pipefail` (`cli/bb:3`). The status propagates as-is, so 4 passes through with no edit **[read]**. A test per command family is still cheap insurance.
- No existing exit code 2–9 is in use (`grep -nE "exit [2-9]|return [2-9]"` → none) **[ran]**, so 4 collides with nothing.
- Bash 3.2: none of the three changes needs a 4.x feature.

## 4. What the plan is silent about

- **Final-line wait.** Should the final line report the raw `Retry-After` or the 60 s cap? A script needs the raw value. Bitbucket usually sends no `Retry-After` (measured 2026-10-24 in `cli/bb:198-200`), so the common case prints the old line.
- **Author fallback.** When `--head` combines with `--author` and the author query returns 0 rows, the client-side author fallback refetches "without the author filter" (`cli/bb:921-926`). Must `--head` survive that refetch? It must, or the fallback lists every PR in the state.
- **Quotes in branch names.** A branch name containing `"` breaks the `q=` expression. `--author` has the same gap today (`cli/bb:510`).
- **Full URLs and edge paths in `bb api`.** A full URL (`https://api.bitbucket.org/2.0/…`) becomes `…2.0/https://…` after the prepend, and an empty path after substitution also needs a decision.
- **The `bb_resolve_user` swallow** (see section 3).

## 5. Scope

Three small, independent slices on three branches, all from one ticket, fit a two-day sprint. Nothing in the plan goes beyond #111. Splitting #112 and #113 out was right.

## Position

Amend. The root cause is the caller, not `bb`. The plan says so, and it still adds real value: a caller can now tell "wait" from "fix the call". The defect is the published contract. The smallest amendment: in the rate-limit slice, make `bb_api_call` and `bb_api_raw` return 4 on HTTP 429, with no retry (about two lines each). Alternatively, scope the documented exit 4 to "paged listings" in `--help` and in SKILL.md. Also add one line saying that `bb_resolve_user` passes 4 through. With either change, I would vote proceed.

## Findings by severity

1. **Medium.** The documented "exit 4 = rate limited" is false for single-request commands. `bb api` on a 429 exits 1 **[ran]**.
2. **Medium.** `bb_resolve_user` swallows a `bb_paginate` failure into `[]` (`cli/bb:141, 149`). The plan's pass-through promise does not hold there.
3. **Low.** Nobody has decided whether `--head` survives the author-fallback refetch (`cli/bb:926`).
4. **Low.** The Open Point "reproduce the original call" can close now. The reproduction above shows that the caller dropped status 1, and that a pipe without `pipefail` yields 0. SKILL.md should tell script callers to check the status or use `set -o pipefail`. Otherwise exit 4 changes nothing for the next such caller.
5. **Low.** The raw-versus-capped `Retry-After` in the final line, `"` in `--head` values, and full URLs passed to `bb api` all need a decision.
