---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: `bb` exits 75 (`EX_TEMPFAIL`) on HTTP 429 in every command, so a script can tell "wait and retry" from "fix the call". Before, a rate limit exited 1, the status of every usage error. Listings print `error: rate limited after <n> rows`, plus ` — Bitbucket asked to wait <s> s` when the final answer carries `Retry-After`, with the raw value instead of the 60 s retry cap. Single requests print `error: rate limited`. Neither message contains `429`. `pr create --reviewer` no longer reports "cannot resolve reviewer" when the lookup is rate limited. `bb --help` and SKILL.md list the exit codes.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
