# show-your-work

Development notes for the executable demo document skill.

## Design Rationale

### Tool Choice: showboat + rodney

- **showboat** creates reproducible markdown documents with executable code blocks
- **rodney** provides persistent Chrome automation for UI screenshots
- Both installed via `uvx` (zero local install, fetched on demand)
- Both are CLI tools — work identically in Claude Code and Cursor (no MCP-specific dependencies)
- Source: a colleague Willison's [showboat](https://github.com/simonw/showboat) and [rodney](https://github.com/simonw/rodney)

### Two-Mode Architecture

- **Proactive**: plan demos during implementation (captures incremental progress)
- **Reactive**: build demos after completion (retrospective evidence gathering)
- Same tool commands, different ordering and intent

### Output Location Convention

- Default: `docs/demos/` (committed, versioned, reviewable in PRs)
- Exception: `tmp/` only when user specifies non-git destination
- Rationale: demos are documentation — belong in version control

### Trigger Design

- Primary: "show your work" (natural language, memorable)
- Secondary: "demo", "prove it works", "demonstrate"
- Not triggered by generic "test" or "screenshot" (too broad)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-17 | Initial version |

## Testing Notes

### Verification Checklist

- [ ] "show your work" triggers this skill
- [ ] Proactive mode works during planning
- [ ] Reactive mode works after completion
- [ ] showboat verify catches output drift
- [ ] Demo committed to docs/demos/
- [ ] PR attachment offer appears
- [ ] rodney screenshots captured correctly

## Related Skills

| Skill | Relationship |
|-------|--------------|
| `handling-pull-requests` | Cross-referenced for PR attachment |
| `commit-notation` | Demo commits use `D` intention |
| `commit` | When to commit demo documents |

## Source Materials

- [simonw/showboat](https://github.com/simonw/showboat) — Executable demo document builder
- [simonw/rodney](https://github.com/simonw/rodney) — Chrome automation CLI
- [Introducing Showboat and Rodney](https://simonwillison.net/2026/Feb/10/showboat-and-rodney/) — a colleague Willison's blog post
