---
"@quatico-solutions/agent-skills": minor
---

dedicated-browser: a new profile gets a window theme color, so the agent's browser looks unlike the human's own. The default is Chrome's own "Orange"; `DEDICATED_BROWSER_COLOR` takes the name of another Chrome theme color, or `none`. The color is written once, when the profile is created: an existing profile keeps its look.

<!--
bumps:
  skills:
    dedicated-browser: minor
  tuned-against: claude-opus-5-5
-->
