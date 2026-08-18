---
"@quatico-solutions/agent-skills": patch
---

`bb` cannot report PR mergeability: Bitbucket's REST API v2 exposes no such field, measured against six open PRs. The PR object carries only `merge_commit` (null while open — a record of a past merge), `links.merge` is a POST action that rejects token auth, and `/diffstat` gives the merge-base comparison without a conflict flag. No derivation is attempted: comparing branch heads or reading an empty diff would answer a different question in the same words. Use `checks` for build status; mergeability stays unavailable on this host.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
