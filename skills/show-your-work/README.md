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

### Screenshot Tool Selection

- Prefer project-native tools (Playwright, Cypress, BDD test runner) over rodney
- Rationale: avoids adding dependencies; reuses existing test infrastructure
- Rodney is the fallback when no project tools exist

### `--help` Delegation

- Skill covers WHEN and WHY, not HOW to use tools
- Keeps skill lean (~80 lines) and avoids churn when tools gain new options
- Inspired by blog post: "The --help text acts a bit like a Skill"

### Gist Workflow for Binary Files

- `gh gist create` rejects binary files (`"binary file not supported"`)
- Workaround: create .md-only gist → `gh gist clone` → git-push images
- Image refs in markdown need SHA-pinned raw URLs for reliable rendering: `gist.githubusercontent.com/<user>/<id>/raw/<sha>/<file>`
- Justified exception to `--help` delegation — multi-tool workflow not discoverable from any single tool's help
- `gh` is repo-agnostic: creates gists in user's GitHub account regardless of project host
- Gist files sort: `!#-.` → digits → `_` → alpha. Since 2025-03, `readme.*` auto-pins to top — name the demo `readme.md` in the gist
- Learned from two internal sessions (early 2026) where the naive approach failed

### No Flowcharts

- v1.1 had two dot flowcharts consuming ~250 words (63 lines of syntax)
- Mode selection was ONE binary decision — a sentence suffices
- Workflow was mostly linear — writing-skills says "Linear instructions → Numbered lists"
- The checklist already captures all workflow steps; the only non-obvious part (verify→re-capture loop) is noted inline
- Removing flowcharts halved the word count and improved smaller-model compatibility

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
- [ ] Gist fallback creates text-only gist then pushes images via clone
- [ ] Image URLs in gist markdown use SHA-pinned raw URLs

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
