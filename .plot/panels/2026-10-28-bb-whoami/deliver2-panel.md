# Delivery panel round 2: bb-whoami

- **Subject:** `docs/plans/2026-10-28-bb-whoami.md` (Approved after the round-1 rejection), merged PRs #121 and #126
- **Date:** 2026-10-29
- **Jurors:** deliverable, behaviour (the two lenses that split in round 1; the changelog lens's gap is closed by #126's changeset)
- **Commitment:** `Position: supported|refuted` (reconciled), `Evidence: executed|read` (gated)
- **Reconciliation:** unanimous — supported

## Evidence per juror

| Juror | Position | Evidence | What it ran |
|---|---|---|---|
| deliverable | supported | executed | bb suite on main (313/313); `bb whoami` with no credentials and against a closed port; read #121 and #126 against the slices and both changesets |
| behaviour | supported | executed | `cli/bb` against a local stub for 200, 401, 429; closed port; no credentials for `whoami`, `api /user`, `pr list`, `auth status`; help output; bb suite 313/313 |

## Checklist

| # | Deliverable | Verdict |
|---|---|---|
| D1 | `bb whoami` runs `cmd_auth_status`; `bb auth status` still works | Done (run) |
| D2 | four lines; `credentials` follows `bb_token`'s order | Done for `BB_TOKEN env` (run); keychain value read only |
| D3 | token and email never printed | Done (run, text and `--json`, stdout and stderr) |
| D4 | `--json` five-key projection; raw body via `bb api /user` | Done (run) |
| D5 | one stderr line and non-zero exit on every failure | Done (run) — 401: 1 line, exit 1; 429: 1 line, exit 75, no `429`; closed port: 1 line with curl's reason, exit 1; no credentials: 1 line, exit 1, on four commands |
| D6 | help texts and `SKILL.md` | Done (help run; `SKILL.md` read) |
| D7 | changelog | Done — `20261028-bb-whoami.md` and `20261029-bb-one-line-errors.md` match the code; the second names the `bb auth status` output change |

## Shared blind spot

Both lenses ran with `BB_TOKEN` set, as the test harness does, so the keychain credential source (`credentials: keychain (com.quatico.bitbucket-cli)`) was read and never run — the same gap round 1 named. Neither ran macOS `/bin/bash` 3.2 directly; the `bb-tests-macos` CI job passed on #121 and #126.
