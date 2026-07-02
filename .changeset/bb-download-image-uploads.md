---
"@quatico-solutions/agent-skills": minor
---

bb CLI: attach images to PRs via the Downloads area — no browser needed. Adds `bb download upload` / `bb download list` and a `bb pr comment --image` convenience flag, and corrects the Bitbucket skills that wrongly claimed image uploads require a browser / have "no API support" ([#9](https://github.com/quatico-solutions/agent-skills/issues/9)).

Also fixes an intermittent EPIPE crash in the bb test harness: `run-bb.ts` now swallows stdin write errors that occur when a fast-exiting command closes its stdin before the helper finishes writing to it.

<!--
bumps:
  skills:
    working-with-bitbucket-api: minor
    handling-pull-requests: minor
    working-with-bitbucket-web: patch
-->
