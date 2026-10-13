---
"@quatico-solutions/agent-skills": patch
---

dedicated-browser: turn translation off through the `translate.enabled` pref instead of `--disable-features=Translate`. Chromium 153+ defines no feature named `Translate`, so the flag was silently ignored and the "Translate this page?" bubble kept appearing. Also corrects the feature-flag comment (the seven remaining names were source-checked and kept).

<!--
bumps:
  skills:
    dedicated-browser: patch
  tuned-against: tencent-hy3
-->
