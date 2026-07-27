---
"@quatico-solutions/agent-skills": patch
---

Fix `bb` on macOS's system bash 3.2, where `--state`, `--method`, `--data`, `--remove-reviewer` and `--jq` all aborted, and gate it with a CI job that runs the suite against `/bin/bash` on macOS

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
