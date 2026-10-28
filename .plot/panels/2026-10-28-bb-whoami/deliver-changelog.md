# Juror verdict: changelog lens

Position: supported
Evidence: executed

Executed: `bb whoami` with no token (exit 1, three stderr lines: "no Bitbucket API token found / Run: bb auth login / Or export BB_TOKEN"); `bb whoami` with BB_TOKEN and unreachable API (curl error plus "no response from Bitbucket", exit 1); `bb auth status --help` (shows whoami alias help). Read: cli/bb:642-710, 2761, 2891; PR #121 and #118 diffs; changeset; SKILL.md diff.

D1: supported — cli/bb:2891 `whoami) shift; cmd_auth_status`; `auth status` still routed (help ran).
D2: supported (read) — cli/bb:700-708 source chosen by BB_TOKEN first, then keychain.
D3: supported (read) — jq projections omit email and token.
D4: supported (read) — cli/bb:694-700 projection; `bb api /user` documented in help.
D5: partial/supported — no-credentials exit 1 executed. Message is three stderr lines, not "one stderr line" (pre-existing bb_token message). Transport failure prints a curl line plus one error line.
D6: supported — `bb --help` lists whoami (cli/bb:2761), `auth status --help` updated, SKILL.md has 3 whoami references (lines 73, 127, 135).
D7: supported with a gap — the plan `## Changelog` entry matches the behaviour. The shipped changeset (.changeset/20261028-bb-whoami.md, folded into PR #118 release notes) is a superset: it also states the `--json` shape change for both `bb whoami --json` and `bb auth status --json`, and the `bb auth status` alias.

Findings the plan did not anticipate:
- Plan changelog omits that `bb auth status --json` changed from the raw `/user` body to a 5-field projection (a breaking change for existing users). The changeset states it; the plan entry does not. The plan's own open checkbox (search callers of `auth status --json` before changing) is not evidenced as done in the diff. Bump is `minor`, not major, for a shape change.
- `bb auth status` text output also changed (new `credentials` line; labels now `nickname:`, `display_name:`, `account_id:`). The changeset does not describe this text change.
- SKILL.md scope-table row changed from `bb auth status` to `bb whoami`; `bb auth status` is no longer mentioned in SKILL.md at all.
