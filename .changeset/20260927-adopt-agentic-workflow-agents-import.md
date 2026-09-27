---
"@quatico-solutions/agent-skills": patch
---

`adopt-agentic-workflow` now checks that `CLAUDE.md` actually loads the hub when `AGENTS.md` is the hub `/plot-init` chose. Claude Code loads `CLAUDE.md` on its own but never `AGENTS.md`, so a repo whose hub is `AGENTS.md` needs `CLAUDE.md` to import it (`@AGENTS.md`) — a prose pointer ("see AGENTS.md") is easy to skim past and leaves the phase-to-skill map effectively invisible to the agent. New step 2 creates the import line if `CLAUDE.md` is missing, replaces a prose pointer with it, or adds it above existing rules and flags the duplication for the user to resolve. Common Mistakes gains a matching entry.

<!--
bumps:
  skills:
    adopt-agentic-workflow: patch
-->
