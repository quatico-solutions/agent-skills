---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: paged `bb` listings retry HTTP 429 up to 5 times per page, waiting 2, 4, 8, 16 and 32 seconds (or `Retry-After`, at most 60 seconds), and print each wait on stderr. Three short retries were too few for `bb pr list --all` on a repository with 3519 merged PRs.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
