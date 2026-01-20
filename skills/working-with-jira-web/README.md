# working-with-jira-web

JIRA web UI navigation skill for Claude Code and Cursor.

## Purpose

Documents mechanics of JIRA web interface operations:
- Creating issues (bugs, stories, tasks)
- Filling form fields (summary, description, fix versions)
- Using the WYSIWYG editor (NOT wiki markup!)
- Linking tickets
- Avoiding browser automation pitfalls

## Design Decisions

### Scope

This skill focuses on **UI mechanics only** — how to interact with JIRA elements, not workflow decisions about when to create tickets or what to include.

### Browser Tool Selection

Same pattern as `working-with-bitbucket-web`: requires native browser integration (Claude in Chrome / Cursor Browser) for SSO authentication. MCP browser tools cannot authenticate.

### WYSIWYG Editor (Critical Discovery)

**JIRA's Atlassian editor is WYSIWYG, NOT wiki markup.** Typing wiki syntax like `h2.` or `{code}` shows literal text, not formatting.

This was discovered during testing on 2026-01-20 when tickets EWZREL-13093 and EWZREL-13094 showed broken formatting with literal wiki markup visible.

**Correct approach:** Use the toolbar buttons or keyboard shortcuts (Cmd+Alt+2 for H2, Cmd+Shift+8 for bullets, etc.)

## Testing History

### 2026-01-20 Formatting Fix & Major Discovery

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
- Solution: Click inside editor before EVERY type action

**Tested operations:**
- Edit ticket description using WYSIWYG toolbar
- Use keyboard shortcuts (Cmd+Alt+2 for H2, Cmd+Shift+8 for bullets)
- Recover from accidental panel triggers

### 2026-01 Initial Development

**Session context:** Creating JIRA tickets for release planning (EWZREL-13062 branch).

**Discovered pitfalls:**
- Escape key closes entire Create dialog, not just dropdowns — learned to click outside instead
- Tab ID can change after dropdown selections — must track and verify
- Create button hidden below fold — must scroll to find it
- Link type dropdown has non-obvious UX — need to click search field after selection

**Tested operations:**
- Create Bug ticket with fix version
- Fill description (using toolbar, not wiki markup)
- Link tickets (verwandt mit / related to)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-01-20 | **Breaking**: Replaced wiki markup with WYSIWYG; added browser automation pitfalls |
| 1.0 | 2026-01 | Initial release with create, linking |

## References

- [JIRA Text Formatting Notation](https://confluence.atlassian.com/jirasoftwareserver/text-formatting-notation-help-939937571.html)
- [JIRA Keyboard Shortcuts](https://confluence.atlassian.com/jirasoftwareserver/keyboard-shortcuts-939937568.html)

## Related Skills

- `working-with-bitbucket-web` — Same browser tool selection pattern
- `quatico-sso-auth` — SSO authentication handling
