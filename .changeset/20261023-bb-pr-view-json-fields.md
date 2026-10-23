---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: `bb pr view <id> --json <fields>` no longer answers a false `HTTP 404`. The field list was read as the PR id. `pr view` now takes a field list and `--jq` like `pr list`, rejects a non-numeric id and `--comments` with a field list before any request, and `--json 42` keeps 42 as the id.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
