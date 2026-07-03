---
"@quatico-solutions/agent-skills": minor
---

story-tracking: define how to archive a completed story. Adds an "Archiving a Story" section (set `status: done` + `archived:` date, `git mv` the folder into `docs/stories/archived/`, repoint inbound links, update the index) plus a matching `archived:` frontmatter field in the template. Previously the skill had no defined end-of-life step for a story.

<!--
bumps:
  skills:
    story-tracking: minor
-->
