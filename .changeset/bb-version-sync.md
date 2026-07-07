---
"@quatico-solutions/agent-skills": patch
---

`bb --version` now reports the skill's actual version — the internal `BB_VERSION` string had been stuck at 1.0.0 across releases. The release chain (`sync-versions.sh`) keeps it in lockstep with the skill version from now on.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
