---
"@quatico-solutions/agent-skills": patch
---

dedicated-browser: `start` opens Chrome for Testing through macOS `open`, so passkeys from a phone (QR code) work. Started from a shell, the terminal app was the browser's responsible process, and Chrome turns off Bluetooth when that process does not declare it: the sign-in dialog had no phone option. The smoke test checks this in `chrome://device-log`.

<!--
bumps:
  skills:
    dedicated-browser: patch
-->
