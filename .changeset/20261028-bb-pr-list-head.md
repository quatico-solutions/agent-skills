---
"@quatico-solutions/agent-skills": minor
---

working-with-bitbucket-api: `bb pr list --head <branch>` lists the PRs of one source branch in one request, e.g. `bb pr list --head <branch> --state merged`. Repeat the flag to cover several branches. Before, finding the merged PR of a deleted branch took `--state merged --all` (3532 PRs in `quatico/ewz-kus-portal`) or a hand-built `bb api` query. `--head` keeps the open default for `--state`. A branch name containing `"` exits 1 with `error: --head cannot contain '"'`.

<!--
bumps:
  skills:
    working-with-bitbucket-api: minor
-->
