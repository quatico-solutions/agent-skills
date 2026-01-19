---
name: working-with-bitbucket-web
description: >-
  Navigates Bitbucket web UI for PR operations. Use when interacting with
  Bitbucket in a browser. Triggers: bitbucket, bitbucket UI, bitbucket web,
  bitbucket PR, bitbucket comments, bitbucket reviewers.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.3"
---

# Working with Bitbucket Web

**For workflow guidance** (when to create PRs, address feedback, signature conventions): See `handling-pull-requests` skill.

This skill covers **Bitbucket UI mechanics only**.

---

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

### Rich Text Editor (Partial Markdown Support)

The description editor is **WYSIWYG** with limited markdown shortcuts:
- `- ` at line start → converts to bullet (enters list mode)
- `## ` at line start → converts to heading

**Pasting markdown**: Works correctly — paste text with `- ` bullets and they render as list items.

**Browser automation typing**: Has a caveat with multi-line lists:
- Type `- first item` → converts to bullet, enters list mode
- Press Enter → auto-creates new bullet (list mode continues)
- Type `second item` (NO dash) → works correctly
- **Don't** type `- ` for subsequent items — you'll get duplicate bullets

**Safest approach**: Use toolbar buttons (bullet list icon, heading dropdown) to avoid ambiguity.

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

## Replying to Comments

1. Scroll to the comment thread
2. Click **"Reply"** link below the comment
3. Type reply in text area (same rich text editor as description)
4. Click **"Add comment now"** button

**Resolving comments**: Click the checkmark/resolve icon on the comment thread.

---

## Common Pitfalls

- Sidebar items (Source, Commits, Branches) navigate away from current PR
- Links in description body are clickable — avoid accidental clicks
- Left sidebar extends into content area — avoid clicking near edges
- Always take a screenshot after edits to verify persistence
