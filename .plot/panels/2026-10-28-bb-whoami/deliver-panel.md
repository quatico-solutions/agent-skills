# Delivery panel: bb-whoami

- **Subject:** `docs/plans/2026-10-28-bb-whoami.md` (Approved, #112), merged PR #121
- **Date:** 2026-10-28
- **Jurors:** deliverable, behaviour, changelog
- **Commitment:** `Position: supported|refuted` (reconciled), `Evidence: executed|read` (gated)
- **Reconciliation:** divided — supported: deliverable, changelog; refuted: behaviour

## Evidence per juror

| Juror | Position | Evidence | What it ran |
|---|---|---|---|
| deliverable | supported | executed | bb suite on main (299/299); read #121's diff against the 7 deliverables |
| behaviour | refuted | executed | `cli/bb` against a local stub for 200, 401, 429; closed port; no credentials (stub `security`); bb suite 299/299 |
| changelog | supported | executed | no-credentials and unreachable-API runs; read the changeset folded into #118 and `SKILL.md` |

## Checklist

| # | Deliverable | Verdict |
|---|---|---|
| D1 | `bb whoami` runs `cmd_auth_status`; `bb auth status` still works | Done (run by behaviour) |
| D2 | four lines; `credentials` follows `bb_token`'s order | Done for `BB_TOKEN env` (run); keychain value only read |
| D3 | token and email never printed | Done (run, text and `--json`, stdout and stderr) |
| D4 | `--json` is the five-key projection; `bb api /user` keeps the raw body | Done (run) |
| D5 | no credentials or 401: one stderr line and exit 1 | **Partial** — 401: one line, exit 1 (run). No credentials: three lines from `bb_token` (`cli/bb:53-55`), exit 1 (run). Closed port: curl's `curl: (7) …` line plus `error: no response from Bitbucket`, exit 1 (run). 429: exit 75 (run). |
| D6 | `bb --help`, `bb auth status --help`, `SKILL.md` updated | Done (help run; `SKILL.md` read) |
| D7 | changelog describes the change | Done with a gap — the changeset names the `--json` shape change but not that `bb auth status` text output changed too |

## The disagreement

All three jurors report the same facts about D5. They disagree on whether D5's gap is fatal:

- **behaviour (refuted):** the plan promises one stderr line; two of the failure paths print two or three. A promise the code does not keep is not delivered.
- **deliverable, changelog (supported):** every failure path exits 1 (or 75), which is the property the plan states the line is for — "so `bb whoami >/dev/null` gates a script". The extra lines come from code outside this plan: `bb_token`'s existing message and curl's own `-S` error, both shared by every command.

The question for the plan owner: is "one stderr line" a contract, or a description of the gate? If a contract, the fix is outside `cmd_auth_status` (make `bb_token` print one line, and drop curl's `-S` where `bb_check_status` already names the failure) and touches every command's error output.

## Gaps no juror closed

- The keychain credential source (`credentials: keychain (com.quatico.bitbucket-cli)`) was read, never run: the test harness always sets `BB_TOKEN`.
- The plan's open point (search callers of `bb auth status --json`) is unticked in the plan. The pre-merge code review did that search and found no caller reading a dropped field.
