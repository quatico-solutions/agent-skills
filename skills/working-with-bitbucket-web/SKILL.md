---
name: working-with-bitbucket-web
description: >-
  Automates Bitbucket web UI via native browser tools. Creates PRs, edits
  descriptions, manages reviewers, resolves comments and tasks. Use when
  interacting with Bitbucket in a browser. Triggers: bitbucket, pull request,
  PR description, PR review, code review, bitbucket comments.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.1"
---

# Working with Bitbucket Web

## Browser Tool Selection

**Use native browser integration** — Bitbucket requires SSO authentication.

| Environment | Tool | Invocation |
|-------------|------|------------|
| Claude Code | Claude in Chrome | `mcp__claude-in-chrome__*` tools |
| Cursor | Cursor Browser | Cmd+Shift+P → "Open Browser" |

**Never use** `WebFetch`, `WebSearch`, or MCP browser tools (Playwright MCP, Chrome DevTools MCP) for Bitbucket. These tools cannot authenticate — they spin up isolated browser instances without your SSO session cookies.

---

## PR Description Editing

Click directly on the description body text to enter edit mode (no separate "Edit" button).

### Rich Text Editor (Not Markdown)

The description editor is **WYSIWYG**, not raw markdown. Raw markdown syntax (`- item`, `## heading`) renders as literal text.

**For formatting:**
- Use toolbar buttons (bullet list icon, heading dropdown)
- Or type plain text without markdown syntax

### Workflow Checklist

Copy and track progress:

```
- [ ] Click description body text
- [ ] Wait for toolbar to appear (confirms edit mode)
- [ ] Make changes (Cmd+A to select all if replacing)
- [ ] Scroll down to reveal Save/Cancel buttons
- [ ] Click Save button
- [ ] Verify: toolbar gone, content updated
```

**Critical**: Changes are NOT auto-saved. Clicking outside or pressing Escape discards changes.

---

## PR Creation

1. Repository → Pull requests → "Create pull request" (top right)
2. Select source and target branches
3. Fill title and description
4. Add reviewers: Right sidebar → "+ Add reviewer" → search and select
5. Click "Create pull request"

---

## UI Reference

| Element | Location | Action |
|---------|----------|--------|
| Title | Top of PR | Click to edit inline |
| Description | Below title | Click body to edit |
| Reviewers | Right sidebar | "+ Add reviewer" |
| Approve | Top right (green) | Approves PR |
| Merge | Top right (blue) | Merges PR |
| Files changed | Tab bar | View diff |
| Commits | Tab bar | View commits |

---

## Common Pitfalls

- Sidebar items (Source, Commits, Branches) navigate away from current PR
- Links in description body are clickable — avoid accidental clicks
- Left sidebar extends into content area — avoid clicking near edges
- Always take a screenshot after edits to verify persistence
