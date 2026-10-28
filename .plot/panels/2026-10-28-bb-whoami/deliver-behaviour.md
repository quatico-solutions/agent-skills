# Delivery verdict, behaviour lens

Position: refuted
Evidence: executed

Executed: cli/bb against a python stub server (200, 401, 429 on 127.0.0.1), closed port 1, no credentials (stub `security` exits 1, BB_TOKEN unset), `bb whoami`, `bb whoami --json`, `bb auth status [--json]`, `bb api /user`, `bb whoami --help`, `bb auth status --help`, `bb --help | grep whoami`, and `pnpm test` in tests/ (299 tests, 299 pass, 0 fail).
Read only: SKILL.md lines 73/127/135, the changeset text, and the cmd_auth_status source (cli/bb:666-725). Not executed: the keychain-success path (credentials: keychain line) and the SKILL.md claims.

D1: supported — `bb whoami` rc=0 and `bb auth status` rc=0, identical output; dispatch at cli/bb:2891-2894.
D2: supported (BB_TOKEN branch executed) — stdout `nickname: jdoe / display_name: Jane Doe / account_id: acc123 / credentials: BB_TOKEN env`. The keychain string was only read (cli/bb:~700); the order matches bb_token (BB_TOKEN non-empty first).
D3: supported — grep for the token and for the email returned 0 hits in stdout and stderr for text and --json, for success and 401. The stub /user body contained an email; whoami dropped it. `bb api /user` does print it, as intended.
D4: supported — --json prints exactly {nickname, display_name, account_id, uuid, credentials}; `bb api /user` still returns the raw body including `type` and `email`.
D5: partial — 401: rc=1, 1 stderr line (`error: HTTP 401 — x`), empty stdout. Correct. No credentials: rc=1 but stderr is 3 lines (`error: no Bitbucket API token found` / `  Run: bb auth login` / `  Or export BB_TOKEN=<token>`), not "one stderr line". Closed port: rc=1 but 2 stderr lines (a raw curl `(7) Failed to connect` line plus `error: no response from Bitbucket`). 429: rc=75, 1 line (`error: rate limited`). The exit-code gate (`bb whoami >/dev/null`) works. The "one stderr line" wording is not met for the no-credentials case.
D6: partial — `bb --help` lists `whoami  Show authenticated user and credential source`; `bb auth status --help` and `bb whoami --help` show the new text; SKILL.md mentions `bb whoami` at lines 73, 127, 135. Read, not run. I did not check that `bb auth status` is listed in the same way.
D7: partial — .changeset/20261028-bb-whoami.md exists but its wording differs from the plan's sentence. It is longer, and it does not contain "It exits non-zero when no credentials work" or "`--json` prints the same facts as JSON". It says "exits 1 when no credentials work" and describes the JSON shape. CHANGELOG.md has no whoami entry yet, which is expected before the release.

Unanticipated findings:
- The no-credentials path exits through bb_token's multi-line message (cli/bb:46-58), so D5's single-line contract fails there. Whether to fix the code or the plan is a decision for the owner.
- Closed-port stderr leaks a raw curl line before the bb error (2 lines).
- `--json` on failure prints nothing on stdout, which is correct for gating.
