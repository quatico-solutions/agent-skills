---
"@quatico-solutions/agent-skills": patch
---

bye: README described pre-2.2.0 behaviour, and the summary template hardcoded a path

`bye` 2.2.0 made the sessionlog directory configurable, but the README still
described the old behaviour in two places — one of which its own "Planned
Improvements" list already marked as done:

- **Tier** claimed the skill "works in any repository with a `sessionlogs/` or
  `changelogs/` directory". It works in any repository that *declares* one.
- **Known Gaps** listed "relies on `sessionlogs/` or `changelogs/` convention"
  as an open limitation. That gap was closed by 2.2.0. Replaced with the gap
  that is actually open: placement is prose, not a gate.

Also, the final-summary template in `SKILL.md` printed
`**Sessionlog:** sessionlogs/[file].md` — wrong in a code repo that keeps logs
under `docs/sessionlogs/`, and wrong in any repo declaring something else. Now
`<sessionlog directory>/[file].md`.

The "Cursor session restoration not yet implemented" gap was checked and is
**accurate** — that guide ships as an explicit placeholder. Left as is.

No behaviour change.

<!--
bumps:
  skills:
    bye: patch
-->
