---
"@quatico-solutions/agent-skills": patch
---

Migrate a `bb` keg installed before the formula rename to `quatico-bb`. `brew update` does not do it by itself on most machines: the old install trusted only the formula `quatico-solutions/tap/bb`, so Homebrew refuses the renamed formula as untrusted and silently skips the keg. `install-dependencies.sh` now trusts the tap and runs `brew migrate quatico-solutions/tap/quatico-bb` when it finds the old keg, and the Step 0 gate sends a `readlink` path under `Cellar/bb/` to that script.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
