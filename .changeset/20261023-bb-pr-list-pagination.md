---
"@quatico-solutions/agent-skills": minor
---

working-with-bitbucket-api: `bb pr list --limit <n>` follows Bitbucket's `next` links until it holds `n` rows, and the fixed 10-page cap is gone. New flags: `--all` (every page) and `--updated-since <ISO>` (inclusive, server-side). `pr list` sends `pagelen=50` and warns on stderr when the default limit truncates the listing. Every paged `bb` listing retries HTTP 429 up to 3 times per page, then exits with `error: rate limited after <n> rows` and prints no rows.

<!--
bumps:
  skills:
    working-with-bitbucket-api: minor
-->
