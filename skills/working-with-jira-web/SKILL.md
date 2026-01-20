---
name: working-with-jira-web
description: >-
  Navigates JIRA web UI for ticket operations. Use when creating issues,
  editing descriptions, linking tickets, or using the WYSIWYG editor in JIRA.
  Triggers: JIRA, JIRA UI, create ticket, link issues, JIRA web, fix version.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.1"
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
5. Fill Description: Click description area → `Cmd+A` (select all) → use WYSIWYG toolbar for formatting
6. **Scroll down** — the Create button is below the fold
7. Click **"Create"** button

### Workflow Checklist

```
- [ ] Open Create dialog (C or click Create)
- [ ] Select Work type from dropdown
- [ ] Fill Summary field
- [ ] Select Fix Version(s)
- [ ] Fill Description (Cmd+A to replace template, use WYSIWYG toolbar)
- [ ] Scroll down to reveal Create button
- [ ] Click Create
- [ ] Verify: ticket created (redirects to ticket or shows success)
```

---

## Description Editor (WYSIWYG)

**CRITICAL**: JIRA uses Atlassian's **WYSIWYG editor**, NOT wiki markup. Typing `h2.`, `{code}`, etc. will show as literal text, not formatting!

### Formatting Reference

| Format | How to Create |
|--------|---------------|
| Heading 2 | Toolbar dropdown OR `Cmd+Alt+2` |
| Heading 3 | Toolbar dropdown OR `Cmd+Alt+3` |
| Bullet list | Toolbar button OR `Cmd+Shift+8` |
| Numbered list | Toolbar button OR `Cmd+Shift+7` |
| Code block | Toolbar "+" → Code snippet |
| Bold | `Cmd+B` |
| Link | `Cmd+K` |

### Editing Workflow

1. Click description body to enter edit mode
2. Wait for toolbar to appear (confirms edit mode)
3. Use `Cmd+A` to select all if replacing content
4. Use toolbar buttons or keyboard shortcuts for formatting
5. **Click Save button** when done (changes NOT auto-saved)

---

## CRITICAL: Browser Automation Pitfalls

### Global Keyboard Shortcuts

**JIRA has global shortcuts that trigger when the editor loses focus.**

| Key | What it Opens |
|-----|---------------|
| `L` | Log Time panel |
| `@` | Add people / Invite to JIRA popup |
| Various | Other panels and dialogs |

**The Problem**: After pressing Enter or navigation keys, focus may leave the description editor. Subsequent keystrokes then trigger these global shortcuts instead of typing.

**Solution**:
1. After EVERY Enter or navigation action, **click inside the editor** before typing
2. Take a screenshot to verify the editor toolbar is active
3. If a panel opens unexpectedly, press **Escape** or click **Cancel**

### @ Symbol Triggers Mentions

Typing `@` anywhere triggers a mention/invite dropdown popup.

**Workaround**: Write package names without `@` (e.g., `ewz/elements` instead of `@ewz/elements`), or press Escape immediately after `@` to dismiss the popup.

### Editor Focus Loss

Signs the editor lost focus:
- Typing triggers a panel instead of appearing in editor
- Toolbar appears grayed out
- List buttons not highlighted

**Recovery**: Press Escape to close panels, click inside editor text, verify toolbar is active

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
| Description | Create dialog | WYSIWYG editor (use toolbar) |
| Fix versions | Create dialog | Multi-select dropdown |
| Linked work items | Ticket view (scroll down) | Section with Add button |

---

## Common Pitfalls

| Issue | Cause | Solution |
|-------|-------|----------|
| "Log Time" panel opens | Editor lost focus, `L` key triggered shortcut | Click Cancel, click in editor, retry |
| "Add people" panel opens | `@` symbol triggered invite flow | Press Escape, avoid `@` or dismiss popup quickly |
| Text not appearing in editor | Focus left editor | Click inside editor before every typing action |
| Wiki markup shows literally | JIRA is WYSIWYG, not wiki | Use toolbar buttons or keyboard shortcuts |
| Changes lost | Clicked outside without saving | Always click Save button explicitly |
| Escape closes entire dialog | Escape has multiple behaviors | Click outside dropdown instead of Escape |
| Create button not visible | Button is below fold | Scroll down in dialog |
| Template text in description | Default template content | Use `Cmd+A` to select all before typing |

---

## Session Cleanup

```
- [ ] Task complete
- [ ] Navigate to about:blank
- [ ] Inform user: "Browser tab ready to close"
```
