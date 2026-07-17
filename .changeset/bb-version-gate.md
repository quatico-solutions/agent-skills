---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: turn the "Prerequisites" step into a real **Step 0 version gate**. The old check only confirmed `bb` *runs* — so an older build, or a `~/bin/bb` symlink left pointing into a previous plugin version, passed while silently lacking newer subcommands/flags, producing failures that look like API/auth errors. The gate now compares `bb --version` and `readlink -f "$(command -v bb)"` against the version this skill ships (`BB_VERSION`), reinstalls from the skill if it's missing/older/foreign, and adds the rule: never diagnose a `bb` error before ruling out a version mismatch.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
