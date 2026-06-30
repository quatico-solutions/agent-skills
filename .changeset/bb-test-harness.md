---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: add a loopback-restricted `BB_API_URL` test seam (refuses non-local hosts so the auth token can't be exfiltrated), guard `bb pr comment --line` against a missing `--file`, and add a 149-test integration suite (node:test + mock server) covering every `bb` command and flag.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
