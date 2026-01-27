---
name: working-with-jira-web
description: >-
  Navigates JIRA for ticket operations. Primary: Atlassian MCP for CRUD.
  Fallback: Browser for visual verification. Triggers: JIRA, create ticket,
  edit ticket, link issues, JQL, fix version.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "2.1"
---

# Working with JIRA

This skill covers JIRA ticket operations with two approaches:
- **Atlassian MCP** (primary) — fast, reliable API access
- **Browser automation** (fallback) — for visual verification or missing API features

---

## Tool Selection Decision Tree

```
Need to interact with JIRA?
├── Create/Read/Update ticket? → Atlassian MCP
├── Search tickets (JQL)? → Atlassian MCP
├── Add comment? → Atlassian MCP
├── Visual verification needed? → Browser automation
├── Feature not in API? → Browser automation
└── Debug why MCP failed? → Browser automation
```

| Operation | Recommended Tool | Why |
|-----------|------------------|-----|
| Create ticket | MCP `createJiraIssue` | Single API call, markdown description |
| Update description | MCP `editJiraIssue` | Markdown input, instant update |
| Read ticket | MCP `getJiraIssue` | Full data, no UI parsing |
| Search (JQL) | MCP `searchJiraIssuesUsingJql` | Structured results |
| Add comment | MCP `addCommentToJiraIssue` | Markdown, no WYSIWYG |
| Link tickets | MCP or Browser | MCP limited, browser more flexible |
| Visual verification | Browser | See rendered result |

---

## Atlassian MCP (Primary)

### Authentication

1. Run `/mcp` in Claude Code
2. Select **atlassian** from the list
3. Complete OAuth flow in browser
4. Sessions expire periodically — re-run `/mcp` if you get auth errors

### Key Tools

| Tool | Purpose |
|------|---------|
| `getJiraIssue` | Fetch ticket details |
| `editJiraIssue` | Update ticket fields (description accepts markdown!) |
| `createJiraIssue` | Create new ticket |
| `addCommentToJiraIssue` | Add comment (markdown) |
| `searchJiraIssuesUsingJql` | Search using JQL |
| `getTransitionsForJiraIssue` | Get available status transitions |
| `transitionJiraIssue` | Change ticket status |

### CloudId Discovery

Most tools require `cloudId`. Get it from search results or use `getAccessibleAtlassianResources`.

### Example: Update Description

```typescript
mcp__plugin_atlassian_atlassian__editJiraIssue({
  cloudId: "your-cloud-id",
  issueIdOrKey: "EWZREL-123",
  fields: {
    description: "## Overview\n\nThis ticket tracks...\n\n- Item 1\n- Item 2\n\n### Technical Details\n\n```\ncode block here\n```"
  }
})
```

**Key insight**: The `description` field accepts **markdown**, not wiki markup or ADF. The API converts it automatically.

### Example: Create Ticket

```typescript
mcp__plugin_atlassian_atlassian__createJiraIssue({
  cloudId: "your-cloud-id",
  projectKey: "EWZREL",
  issueTypeName: "Bug",
  summary: "Button not working on mobile",
  description: "## Steps to Reproduce\n\n1. Open on mobile\n2. Tap button\n3. Nothing happens"
})
```

### Example: Search with JQL

```typescript
mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql({
  cloudId: "your-cloud-id",
  jql: "project = EWZREL AND fixVersion = '1.7' ORDER BY created DESC",
  maxResults: 50
})
```

### MCP vs Browser Comparison

| Aspect | MCP API | Browser Automation |
|--------|---------|-------------------|
| Description update | 1 API call | ~20+ interactions |
| Input format | Markdown | WYSIWYG toolbar |
| Focus issues | None | Constant problem |
| Keyboard traps | None | `L`, `@` shortcuts |
| Reliability | ~100% | ~60% |
| Speed | <1 second | 30+ seconds |

---

## Browser Automation (Fallback)

Use browser automation only when:
- Visual verification of rendered content
- Features not available in MCP (some link types, attachments)
- Debugging why MCP approach failed

### Browser Tool Selection

**Use native browser integration** — JIRA requires SSO authentication.

| Environment | Tool | Invocation |
|-------------|------|------------|
| Claude Code | Claude in Chrome | `mcp__claude-in-chrome__*` tools |
| Cursor | Cursor Browser | Cmd+Shift+P → "Open Browser" |

**Never use** `WebFetch`, `WebSearch`, Playwright MCP, or Chrome DevTools MCP for JIRA — they cannot authenticate.

### Tab Management

- **Start**: Create NEW tab with `tabs_create_mcp`
- **End**: Navigate to `about:blank` (no close tab tool)
- **Track**: Store `tabId` and use consistently

### WYSIWYG Editor (When You Must Use It)

JIRA uses Atlassian's **WYSIWYG editor**, NOT wiki markup.

| Format | How to Create |
|--------|---------------|
| Heading 2 | Toolbar dropdown OR `Cmd+Alt+2` |
| Heading 3 | Toolbar dropdown OR `Cmd+Alt+3` |
| Bullet list | Toolbar button OR `Cmd+Shift+8` |
| Code block | Toolbar "+" → Code snippet |

### Critical Browser Pitfalls

| Issue | Cause | Solution |
|-------|-------|----------|
| "Log Time" panel opens | `L` key when editor unfocused | Click Cancel, re-focus editor |
| "Add people" popup | `@` symbol | Press Escape, avoid `@` |
| Text not appearing | Focus left editor | Click inside before typing |
| Wiki markup literal | JIRA is WYSIWYG | Use toolbar, not `h2.` syntax |

**Why MCP is better**: All these pitfalls disappear with the API approach.

### Advanced: JavaScript Content Injection

For complex descriptions (tables, multiple sections, links), directly inject HTML into ProseMirror:

```javascript
const editor = document.querySelector('.ProseMirror');
editor.innerHTML = `
<h2>Goal</h2>
<p>Description with <strong>formatting</strong> and <a href="...">links</a></p>
<table>
  <tr><th>Column</th><th>Value</th></tr>
  <tr><td>Row 1</td><td>Data</td></tr>
</table>
`;
editor.dispatchEvent(new Event('input', { bubbles: true }));
```

**When to use:**
- Complex descriptions with tables, nested lists, multiple headings
- Content with many links (Bitbucket, external URLs)
- Avoiding focus-loss issues during multi-section entry

**Why this works:**
- JIRA uses ProseMirror editor under the hood
- Direct HTML injection bypasses WYSIWYG interaction fragility
- `input` event dispatch triggers JIRA's state management

---

## Workflow Recommendations

### For Ticket Updates

1. **First choice**: Use `editJiraIssue` MCP tool with markdown
2. **If MCP fails**: Check authentication (`/mcp` → atlassian)
3. **Visual check needed**: Open in browser to verify rendering

### For New Tickets

1. **First choice**: Use `createJiraIssue` MCP tool
2. **After creation**: Optionally open in browser to verify/add features not in API

### For Searches

Always use `searchJiraIssuesUsingJql` — structured data, no HTML parsing needed.

---

## Session Cleanup

```
- [ ] Task complete
- [ ] If browser was used: Navigate to about:blank
- [ ] Inform user of completion
```
