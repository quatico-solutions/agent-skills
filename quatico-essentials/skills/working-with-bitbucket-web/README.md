# working-with-bitbucket-web

Development notes for the Bitbucket web automation skill.

## Reference Documentation

| Resource | URL |
|----------|-----|
| Agent Skills Best Practices | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices |
| Agent Skills Specification | https://agentskills.io/specification |
| Anthropic Example Skills | https://github.com/anthropics/skills |
| webapp-testing skill | https://github.com/anthropics/skills/tree/main/skills/webapp-testing |

## Key Design Decisions

### Naming: `working-with-bitbucket-web`
- Gerund form ("working-with") per best practices
- `-web` suffix distinguishes from API/CLI interactions

### Browser Tool Selection (Critical)
Native browser tools required because Bitbucket uses SSO authentication.
MCP browser tools (Playwright, Chrome DevTools) spin up isolated instances without session cookies.

### Optimization for Smaller Models (Critical)
This skill must be followable by Sonnet and Haiku, not just Opus. Design rules:
- **Numbered steps** for multi-step workflows (not prose)
- **Explicit key sequences** (e.g., "press `Enter`" not "continue to next line")
- **One action per step** (don't combine "type X and press Enter")
- **Avoid ambiguity** — if toolbar buttons work better than markdown shortcuts, say so explicitly
- **Include "Avoid" sections** listing common mistakes

## Rich Text Editor Testing (2025-01)

### Test Environment
- Bitbucket Cloud (bitbucket.org)
- Tested via Claude in Chrome MCP tools

### Findings

| Input Method | Behavior |
|--------------|----------|
| Type `- item` at line start | Converts to bullet, enters list mode |
| Type `## heading` | Converts to heading (removes ##) |
| Press Enter in list mode | Auto-creates new bullet |
| Type `- ` for 2nd+ bullet | Creates DUPLICATE (bullet + literal dash) |
| Paste markdown text | Works correctly (editor parses on paste) |

### Recommendation
For browser automation:
1. Use `- ` only for first bullet
2. Press Enter to continue list (auto-bullets)
3. Type text without dash for subsequent items
4. OR use toolbar buttons for guaranteed formatting

## Nested List Testing (2026-01)

### Test Environment
- Bitbucket Cloud (bitbucket.org)
- PR description editor
- Tested via Claude in Chrome MCP tools

### Findings

| Input Method | Behavior |
|--------------|----------|
| Toolbar bullet button | Starts list reliably, no markdown parsing issues |
| `Enter` in list mode | Auto-creates bullet at same indent level |
| `Tab` in list mode | Indents to create sub-item |
| `Shift+Tab` in list mode | Unindents back to parent level |
| `Enter Enter` | Exits list mode (creates paragraph) |
| `## heading` inside list | Renders as LITERAL TEXT (not converted to heading) |

### Key Insight
The WYSIWYG editor only converts markdown shortcuts at line start in **normal paragraph mode**. Inside list mode, markdown shortcuts like `## ` render as literal text. This means:
- Section headings must be created BEFORE starting a list, or AFTER exiting list mode
- Use toolbar buttons for all formatting while in list mode
- Prefer nested lists over tables (tables don't render at all)

## ProseMirror JavaScript Injection Testing (2026-01-27)

### Discovery
Direct `.ProseMirror.innerHTML` injection for complex content

### Context
Creating PR #47 description with nested structure and cross-references

### Problem
Duplicate bullets when mixing markdown input (`- `) with list mode (already auto-bulleted)

### Solution
JavaScript injection of complete HTML structure, bypassing WYSIWYG entirely

### Results
- Reliable complex content entry
- Lists render correctly without duplicates
- Single operation vs. fragile multi-step interactions

**Note:** Same technique documented in `working-with-jira-web` skill. Duplication intentional for discoverability.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.5 | 2026-01-27 | Added ProseMirror JavaScript injection technique (same as JIRA skill) |
| 1.0 | 2025-01 | Initial skill (bitbucket-ui) |
| 1.1 | 2025-01 | Renamed to working-with-bitbucket-web, added browser tool guidance |
| 1.2 | 2025-01 | Updated rich text editor guidance based on testing |
| 1.3 | 2025-01 | Added image insertion workflow |
| 1.3 | 2026-01 | Split workflow content to `handling-pull-requests`, added comment reply section |
| 1.4 | 2026-01 | Added tab management guidance (create new tabs, cleanup when done) |
| 1.4 | 2026-01 | Added step-by-step nested list workflow, optimized for Sonnet/Haiku |
