---
"@quatico-solutions/agent-skills": patch
---

`bb` reads `-R workspace/repo` at any position before `--`, so `bb pr list -R ws/repo` works like `bb -R ws/repo pr list`. Two `-R` with different values exit 1.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
