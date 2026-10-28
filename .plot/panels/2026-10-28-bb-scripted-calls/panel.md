# Panel: bb-scripted-calls

- **Subject:** `docs/plans/2026-10-28-bb-scripted-calls.md` (Draft, #111)
- **Date:** 2026-10-28
- **Jurors:** contracts, bitbucket-api, implementer, root-cause
- **Commitment:** `Position: proceed|amend|reject` (reconciled), `Evidence: read|ran` (gated)
- **Reconciliation:** unanimous — amend (4 of 4)

## Evidence per juror

| Juror | Position | Evidence | What it ran |
|---|---|---|---|
| contracts | amend | ran | `/bin/bash` 3.2.57 probe of `return 4` through `set -e`; `cli/bb` against a closed loopback port; pr-list suite 45/45 |
| bitbucket-api | amend | ran | `cli/bb api` against a logging loopback server to capture the URLs it builds; Atlassian docs via web |
| implementer | amend | ran | full suite 62/62; `/bin/bash` 3.2 probe of exit-status propagation |
| root-cause | amend | ran | installed tap binary vs `cli/bb` (byte-identical); #111's command against an always-429 server; Python `subprocess.run` repro |

The moderator re-ran two claims: `BB_API_URL=http://127.0.0.1:9 cli/bb pr list --all --json` exits 0 and prints `[]`; `plot-host.sh` `host_failure_kind` classifies stderr containing `429` as `secondary` and `rate limit` as `throttled`.

## Agreed findings

Each finding is held by the jurors named; none was contradicted by another juror.

1. **A transport failure exits 0 with `[]`** (contracts; confirmed by the moderator). curl status 7 yields HTTP status `000`, which `bb_paginate` treats as success. This is the "looks like success" failure #111 describes, and the plan does not cover it.
2. **"Passed through by its callers" is false for five call sites** (all four). `cmd_pr_list` (`cli/bb:919`, `:927`) and `download list` (`cli/bb:2651`) collapse 4 to 1; `bb_resolve_user` (`cli/bb:141`, `:149`) turns a 429 into "cannot resolve reviewer". The ten bare-assignment call sites pass 4 through unchanged under `set -euo pipefail`.
3. **`--head` is dropped by the zero-row author refetch** (contracts, bitbucket-api, implementer). `cli/bb:924`–`927` rebuild the query without heads, so `--author X --head b` silently lists every branch.
4. **The final 429 line must read `Retry-After` uncapped and before `hdr_file` is removed** (contracts, implementer, bitbucket-api). Otherwise an hourly wait is reported as 60 s.
5. **#111's own use case needs `--state merged`** (contracts, bitbucket-api). `--head` alone keeps the OPEN default.
6. **`bb api` with a full `next` URL is not fixed by prepending `/`** (bitbucket-api). `/2.0/http://…` stays broken; strip the `https://api.bitbucket.org/2.0` prefix or refuse it.
7. **The incident was the caller's** (root-cause). Released 1.12.1 exited 1; the reporter's Python call ignored it. Exit 4 alone would not have prevented it — a caller that ignores 1 ignores 4. The plan's open point "reproduce the original call" can close on this evidence.

## Disagreements

The panel agrees the plan needs amending. It disagrees on three amendments, and averaging them would hide a decision the plan owner must make.

### Which commands exit 4

- **root-cause:** `bb_api_call` and `bb_api_raw` return 4 on HTTP 429 now, with no retry. Otherwise the documented "4 = rate limited" is false for `bb api`, `pr view`, `pr merge`, `source cat` and every single-request command.
- **bitbucket-api:** state that exit 4 covers paged listings only, until `bb_api_call` retries.
- **contracts:** either is acceptable if stated; the follow-up that extends 4 to `bb pr merge`, `pr create` and `pr edit` collides with Plot, which passes those exit codes through and reads 4 as "cannot be asked, do not retry".

The problem underneath: a documented exit code that holds for some commands and not others. Both proposals end that; they differ on whether the sprint pays for it now.

### Whether the code is 4

- **contracts:** gh uses 4 for "authentication required", and `bb` copies gh's conventions; Plot uses 4 for "cannot be asked". Record why 4 was chosen, or pick 75 (`EX_TEMPFAIL`).
- **the other three:** accept 4 without comment.

Nobody argued for 4 on its merits; the other three did not examine the choice.

### What the final line promises

- **bitbucket-api:** Atlassian documents a rolling one-hour limit and `X-RateLimit-*` headers; it found no statement that a 429 carries `Retry-After`. The Changelog's "names the wait" will rarely hold; reword it.
- **contracts, implementer:** print `Retry-After` uncapped when present.
- **contracts:** the wording is a contract with Plot — keep `rate limited`, omit `429`, or Plot reads a spent hourly quota as a short burst.

These are compatible; together they say: print the wait only when the header exists, never promise it, and keep the line's words fixed.

## Single-juror findings worth carrying

- **Slices 1 and 2 conflict** (implementer): both edit `cmd_pr_list`, `tests/pr-list.test.ts` and `SKILL.md`. Order slice 1 before slice 2 with a `waits:` annotation; one changeset per branch.
- **Branch names with `"` break `q=`** (bitbucket-api); `--author` has the same gap today. The escape rule was not found in Atlassian's docs.
- **`--jq` already exits 3 and 5** (contracts), so documenting only 4 leaves other non-zero codes undefined.

## Shared blind spot

All four lenses accepted #111's framing that a better exit code is the remedy. Two jurors found evidence against that framing from different sides — root-cause showed the incident's caller ignored the status it got, and contracts found a path that returns success outright — but no lens was asked whether the plan's first slice should be "never exit 0 without a 2xx" rather than "exit 4 on 429". Finding 1 is the more severe defect and sits outside every slice as written.

No juror looked at `SKILL.md`'s guidance to script authors. root-cause recommends it say "check the exit status or use `set -o pipefail`"; that is the change that would have prevented #111's incident.

## For the plan owner

Amend before approval. The amendments the panel agrees on: findings 1–6, a `waits:` order between slices 1 and 2, and closing the reproduction open point with finding 7. The three disagreements above need a decision recorded in the plan.
