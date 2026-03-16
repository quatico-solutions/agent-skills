# working-with-jira-web

JIRA operations skill for Claude Code and Cursor.

## Purpose

Documents approaches for JIRA ticket operations:
- **Primary**: Atlassian MCP for create/read/update/search
- **Fallback**: Browser automation for visual verification
- Avoiding browser automation pitfalls when necessary

## Design Decisions

### Scope

This skill focuses on **how to interact with JIRA** — tool selection, API usage, and UI mechanics. Does not cover workflow decisions about when to create tickets or what to include.

### Tool Selection (v2.0 Change)

**Atlassian MCP is now the primary approach.** Browser automation is relegated to fallback for visual verification or features missing from the API.

| Approach | When to Use |
|----------|-------------|
| Atlassian MCP | All CRUD operations, searches, comments |
| Browser (Claude in Chrome / Cursor Browser) | Visual verification, debugging, missing API features |

### Browser Tool Selection (Fallback Only)

Same pattern as `working-with-bitbucket-web`: requires native browser integration for SSO authentication. MCP browser tools (Playwright, Chrome DevTools) cannot authenticate.

## Testing History

### 2026-01-27 ProseMirror JavaScript Injection

**Discovery:** Direct `.ProseMirror.innerHTML` injection for complex content

**Context:** Creating CDSTLZ-181 with tables, 5 implementation sections, Bitbucket links

**Problem:** Character-by-character typing failed due to:
- Focus loss when applying headings (content deleted)
- Table entry impossible via WYSIWYG
- Multiple heading applications unreliable

**Solution:** JavaScript injection of complete HTML structure

**Results:**
- 100% reliable for complex descriptions
- Tables render correctly
- Links work properly
- Single operation vs. dozens of fragile interactions

**Note:** Same technique documented in `working-with-bitbucket-web` skill. Duplication intentional for discoverability.

### 2026-01-21 MCP Discovery (Major)

**Session context:** Testing atlassian MCP plugin for ticket updates.

**Critical discovery: Atlassian MCP is vastly superior to browser automation!**

| Aspect | MCP API | Browser Automation |
|--------|---------|-------------------|
| Description update | 1 API call | ~20+ interactions |
| Input format | Markdown | WYSIWYG toolbar |
| Focus issues | None | Constant problem |
| Keyboard traps | None | `L`, `@` shortcuts |
| Reliability | ~100% | ~60% |

**Key findings:**
- `editJiraIssue` accepts markdown directly and updates instantly
- No WYSIWYG pitfalls (focus loss, keyboard shortcuts, toolbar navigation)
- Authentication via `/mcp` command (OAuth, sessions expire periodically)

**Recommendation:** Use MCP for all CRUD operations, browser only for visual verification.

### 2026-01-20 Formatting Fix & WYSIWYG Discovery

**Session context:** Fixing tickets EWZREL-13093 and EWZREL-13094 that showed broken formatting.

**Critical discovery: JIRA uses WYSIWYG, NOT wiki markup!**
- Tickets had literal `h2.`, `{code}` text visible instead of formatted content
- Root cause: Skill incorrectly documented wiki markup usage
- Fix: Updated skill to document WYSIWYG editor and toolbar usage

**Browser automation pitfalls discovered:**
- `L` key triggers "Log Time" panel when editor loses focus
- `@` symbol triggers "Add people to Jira" popup
- Editor focus silently lost after Enter/navigation keys
- Subsequent keystrokes captured by global shortcuts instead of editor

### 2026-01 Initial Development

**Session context:** Creating JIRA tickets for release planning (EWZREL-13062 branch).

**Discovered pitfalls:**
- Escape key closes entire Create dialog, not just dropdowns
- Tab ID can change after dropdown selections
- Create button hidden below fold
- Link type dropdown has non-obvious UX

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | 2026-01-27 | Added ProseMirror JavaScript injection technique for complex browser automation |
| 2.0 | 2026-01-21 | **Breaking**: Atlassian MCP as primary approach, browser demoted to fallback |
| 1.1 | 2026-01-20 | Replaced wiki markup with WYSIWYG; added browser automation pitfalls |
| 1.0 | 2026-01 | Initial release with create, linking |

## References

- [Atlassian MCP Plugin](https://github.com/anthropics/claude-code/tree/main/packages/mcp-plugin-atlassian) — OAuth authentication, JIRA/Confluence API access
- [JIRA Text Formatting Notation](https://confluence.atlassian.com/jirasoftwareserver/text-formatting-notation-help-939937571.html)
- [JIRA Keyboard Shortcuts](https://confluence.atlassian.com/jirasoftwareserver/keyboard-shortcuts-939937568.html)

## Related Skills

- `working-with-bitbucket-web` — Browser tool selection pattern (SSO)
- `quatico-sso-auth` — SSO authentication handling
