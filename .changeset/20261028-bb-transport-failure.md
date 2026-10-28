---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: `bb` exits 1 with `error: no response from Bitbucket` when a request gets no HTTP answer. Before, `bb pr list --all --json` against an unreachable API printed `[]` and exited 0, and `bb auth status` printed nothing and exited 0. Only a 2xx status now counts as success in all five status checks (`bb api`, listings, raw reads, uploads, `auth login`). `auth login` no longer stores credentials after a failed connection. SKILL.md tells script authors to check `bb`'s exit status, or to set `pipefail` when piping `bb`.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
