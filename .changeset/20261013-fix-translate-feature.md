---
"@quatico-solutions/agent-skills": patch
---

dedicated-browser: turn translation off through the `translate.enabled` pref instead of `--disable-features=Translate`. Chromium has no feature named `Translate` since 138, so Chrome ignored the flag and the "Translate this page?" bubble appeared.

<!--
bumps:
  skills:
    dedicated-browser: patch
-->
