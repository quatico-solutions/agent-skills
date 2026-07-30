---
"@quatico-solutions/agent-skills": patch
---

Fix `bb api` unconditionally piping every response through `jq .`, which broke on non-JSON bodies (e.g. raw file content from the source endpoint) with a confusing `jq: parse error`. It now pretty-prints only when the body actually parses as JSON, and passes anything else through untouched.

Also add a note about the global `-R` flag to the per-subcommand `--help` text for `bb source cat` and `bb api`, so it's visible from inside the subcommand help rather than only `bb --help`.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
