---
"@quatico-solutions/agent-skills": patch
---

dedicated-browser: remove `DialMediaRouteProvider` from `--disable-features`. Chromium has no feature of that name since 153, so Chrome ignored it. The smoke test now checks that a German page gets no translate offer, and the new `tests/feature-names.sh` checks every remaining name against the Chromium source of the installed version.

<!--
bumps:
  skills:
    dedicated-browser: patch
-->
