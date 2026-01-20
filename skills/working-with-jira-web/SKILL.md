---
name: working-with-jira-web
description: >-
  Navigates JIRA web UI for ticket operations. Use when creating issues,
  filling forms, linking tickets, or working with wiki markup in JIRA.
  Triggers: JIRA, JIRA UI, create ticket, link issues, JIRA web, fix version.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.0"
---

# Working with JIRA Web

This skill covers **JIRA UI mechanics only**.

---

## Browser Tool Selection

**Use native browser integration** — JIRA requires SSO authentication.

| Environment | Tool | Invocation |
|-------------|------|------------|
| Claude Code | Claude in Chrome | `mcp__claude-in-chrome__*` tools |
| Cursor | Cursor Browser | Cmd+Shift+P → "Open Browser" |

**Never use** `WebFetch`, `WebSearch`, or MCP browser tools (Playwright MCP, Chrome DevTools MCP) for JIRA. These tools cannot authenticate — they spin up isolated browser instances without your SSO session cookies.

### Tab Management

**Start of session**: Create a NEW tab with `tabs_create_mcp`. Store the `tabId` and use it consistently — wrong tab IDs cause silent failures.

**End of session**: Navigate to `about:blank` when done. Claude in Chrome has no close tab tool.

---

## Creating Issues

1. Open Create dialog: Click **"Create"** button (top right) or press `C` keyboard shortcut
2. Change Work type: Click dropdown → select type (Bug, Story, Task, etc.)
3. Fill Summary: Click field → type summary text
4. Select Fix Version: Click "Fix versions" dropdown → select version from list
5. Fill Description: Click description area → `Cmd+A` (select all) → type wiki markup
6. **Scroll down** — the Create button is below the fold
7. Click **"Create"** button

### Workflow Checklist

```
- [ ] Open Create dialog (C or click Create)
- [ ] Select Work type from dropdown
- [ ] Fill Summary field
- [ ] Select Fix Version(s)
- [ ] Fill Description (Cmd+A to replace template)
- [ ] Scroll down to reveal Create button
- [ ] Click Create
- [ ] Verify: ticket created (redirects to ticket or shows success)
```

---

## JIRA Wiki Markup

Use in description fields:

| Element | Syntax |
|---------|--------|
| Heading 2 | `h2. Heading` |
| Heading 3 | `h3. Subheading` |
| Code block | `{code}...{code}` |
| Table header | `\|\| Col1 \|\| Col2 \|\|` |
| Table row | `\| cell1 \| cell2 \|` |
| Bullet list | `* item` |
| Numbered list | `# item` |
| Bold | `*bold*` |
| Italic | `_italic_` |
| Link | `[text\|url]` |

---

## Linking Tickets

1. Open the ticket you want to link FROM
2. Scroll to **"Linked work items"** section
3. Click **"Add linked work item"**
4. Select link type from dropdown (e.g., "verwandt mit" = related to)
5. Click in search field → type ticket ID (e.g., `EWZREL-13062`)
6. Select ticket from dropdown results
7. Click **"Link"** button

### Workflow Checklist

```
- [ ] Open source ticket
- [ ] Scroll to "Linked work items" section
- [ ] Click "Add linked work item"
- [ ] Select link type from dropdown
- [ ] Type ticket ID in search field
- [ ] Select from dropdown results
- [ ] Click Link button
- [ ] Verify: link appears in section
```

---

## UI Reference

| Element | Location | Action |
|---------|----------|--------|
| Create button | Top navigation (right) | Opens create dialog |
| Work type | Create dialog (top) | Dropdown to select type |
| Summary | Create dialog | Text field |
| Description | Create dialog | Wiki markup textarea |
| Fix versions | Create dialog | Multi-select dropdown |
| Linked work items | Ticket view (scroll down) | Section with Add button |

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Escape key closes entire dialog | Click outside dropdown instead of pressing Escape |
| Tab switches after dropdown selection | Always track `tabId`, verify after dropdown operations |
| Create button not visible | Scroll down in dialog — button is below fold |
| Link type doesn't show selection | Click search field and type directly after selecting type |
| Template text in description | Use `Cmd+A` to select all before typing new content |
| Dialog closes unexpectedly | Avoid clicking outside dialog boundaries |

---

## Session Cleanup

```
- [ ] Task complete
- [ ] Navigate to about:blank
- [ ] Inform user: "Browser tab ready to close"
```
