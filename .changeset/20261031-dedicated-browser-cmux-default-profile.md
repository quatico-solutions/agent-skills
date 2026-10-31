---
"@quatico-solutions/agent-skills": minor
---

dedicated-browser: the cmux backend uses cmux's Default profile by default, as the agents' browser, while the human keeps their own logins in another browser. A profile of the agent's own is opt-in with `DEDICATED_BROWSER_CMUX_PROFILE`. An agent inside cmux now gets the cmux backend whenever cmux's browser is enabled, with no setup step, and Chrome when it is off; `setup` follows the same rule. In the opt-in mode, `setup` keeps the human's last-used cmux profile: `cmux browser profiles add` had made the new agent profile the last-used one.

<!--
bumps:
  skills:
    dedicated-browser: minor
  tuned-against: claude-opus-5-5
-->
