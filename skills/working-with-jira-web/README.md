# working-with-jira-web

JIRA web UI navigation skill for Claude Code and Cursor.

## Purpose

Documents mechanics of JIRA web interface operations:
- Creating issues (bugs, stories, tasks)
- Filling form fields (summary, description, fix versions)
- Using JIRA wiki markup
- Linking tickets

## Design Decisions

### Scope

This skill focuses on **UI mechanics only** — how to interact with JIRA elements, not workflow decisions about when to create tickets or what to include.

### Browser Tool Selection

Same pattern as `working-with-bitbucket-web`: requires native browser integration (Claude in Chrome / Cursor Browser) for SSO authentication. MCP browser tools cannot authenticate.

### Wiki Markup vs Rich Editor

JIRA supports both wiki markup and a rich text editor. This skill documents wiki markup because:
1. More predictable with browser automation (no WYSIWYG quirks)
2. Easier to template and modify programmatically
3. Consistent across JIRA versions

## Testing History

### 2026-01 Initial Development

**Session context:** Creating JIRA tickets for release planning (EWZREL-13062 branch).

**Discovered pitfalls:**
- Escape key closes entire Create dialog, not just dropdowns — learned to click outside instead
- Tab ID can change after dropdown selections — must track and verify
- Create button hidden below fold — must scroll to find it
- Link type dropdown has non-obvious UX — need to click search field after selection

**Tested operations:**
- Create Bug ticket with fix version
- Fill description with wiki markup (replacing template)
- Link tickets (verwandt mit / related to)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial release with create, wiki markup, linking |

## References

- [JIRA Text Formatting Notation](https://confluence.atlassian.com/jirasoftwareserver/text-formatting-notation-help-939937571.html)
- [JIRA Keyboard Shortcuts](https://confluence.atlassian.com/jirasoftwareserver/keyboard-shortcuts-939937568.html)

## Related Skills

- `working-with-bitbucket-web` — Same browser tool selection pattern
- `quatico-sso-auth` — SSO authentication handling
