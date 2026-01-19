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

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial skill (bitbucket-ui) |
| 1.1 | 2025-01 | Renamed to working-with-bitbucket-web, added browser tool guidance |
| 1.2 | 2025-01 | Updated rich text editor guidance based on testing |
| 1.3 | 2026-01 | Split workflow content to `handling-pull-requests`, added comment reply section |
