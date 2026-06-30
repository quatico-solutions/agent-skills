---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: restore the `BB_API_URL` test seam, guard `bb pr comment --line` against a missing `--file`, and add a 148-test integration suite (vitest-style node:test + mock server) covering every `bb` command and flag.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
