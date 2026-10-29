---
"@quatico-solutions/agent-skills": minor
---

working-with-bitbucket-api, handling-pull-requests, working-with-bitbucket-web, bye: run `bb --version | grep -q quatico-bb` before the first `bb` call. `install-dependencies.sh` runs the same check on the installed binary and exits 1 with the install command when it prints another package. In `working-with-bitbucket-api` step 0, an absent `bb` says `bb is not installed`; a foreign `bb` (`bb-cli`, the `bb` cask) stops with one line naming it and `brew install quatico-solutions/tap/quatico-bb`. Before, a wrong `bb` failed later on an unknown flag with no hint of the wrong install.

<!--
bumps:
  skills:
    working-with-bitbucket-api: minor
    handling-pull-requests: patch
    working-with-bitbucket-web: patch
    bye: patch
-->
