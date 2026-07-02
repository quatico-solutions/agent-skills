---
name: working-with-bitbucket-web
description: "Last resort for Bitbucket operations that `bb` CLI cannot handle (SSO-gated pages). Prefer `working-with-bitbucket-api` for all PR operations, including image uploads. Triggers: bitbucket UI, bitbucket web, bitbucket SSO."
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.5.1"
---

# Working with Bitbucket Web

## CRITICAL: Use `bb` CLI First

**Before using the browser, try `bb` CLI (`working-with-bitbucket-api` skill).** It handles all PR operations — create, edit, comment, approve, merge, resolve — including markdown descriptions. Run `bb --help` for the full command list.

**Only use this browser skill for:**
- SSO-gated pages that require browser authentication

> **Image uploads no longer need a browser.** Attach images to PR comments and
> descriptions via the API with `bb pr comment --image <file>` or
> `bb download upload <file>` (see `working-with-bitbucket-api`). The manual
> drag-drop workflow below remains only as a fallback if the CLI is unavailable.

If you also need PR workflow guidance (templates, feedback process), invoke `handling-pull-requests`.

---

## Browser Tool Selection

**Use native browser integration** — Bitbucket requires SSO authentication.

| Environment | Tool | Invocation |
|-------------|------|------------|
| Claude Code | Claude in Chrome | `mcp__claude-in-chrome__*` tools |
| Cursor | Cursor Browser | Cmd+Shift+P → "Open Browser" |

**Never use** `WebFetch`, `WebSearch`, or MCP browser tools (Playwright MCP, Chrome DevTools MCP) for Bitbucket. These tools cannot authenticate — they spin up isolated browser instances without your SSO session cookies.

### Tab Management (Critical)

**Start of session**: Always create a NEW tab with `tabs_create_mcp`. Never reuse tabs from previous sessions — tab IDs don't persist and another Claude instance may have left stale state.

**End of session**: Navigate to `example.com` when done. Claude in Chrome has no close tab tool, so this signals to the user that the tab is safe to close.

```
Session cleanup:
- [ ] Task complete
- [ ] Navigate to example.com
- [ ] Inform user: "Browser tab ready to close"
```

---

## PR Description Editing

Click directly on the description body text to enter edit mode (no separate "Edit" button).

### Rich Text Editor (Partial Markdown Support)

The description editor is **WYSIWYG** with limited markdown shortcuts:
- `- ` at line start → converts to bullet (enters list mode)
- `## ` at line start → converts to heading

**Pasting markdown**: Works correctly — paste text with `- ` bullets and they render as list items.

**Browser automation typing**: Use toolbar buttons for reliable formatting.

### Creating Nested Lists (Step-by-Step)

**This workflow is reliable for automation. Follow exactly:**

1. **Start list**: Click bullet list button in toolbar
2. **Type first item**: Type text, press `Enter`
3. **Continue list**: Type next item (auto-bulleted), press `Enter`
4. **Indent (sub-item)**: Press `Tab`, type text, press `Enter`
5. **Unindent (back to parent)**: Press `Shift+Tab`, type text, press `Enter`
6. **Exit list**: Press `Enter` twice (creates blank line, exits list mode)

**Key behaviors:**
- `Enter` → continues list at current indent level
- `Tab` → indents to create sub-item (nested bullet)
- `Shift+Tab` → unindents back to parent level
- `Enter Enter` → exits list mode

**Avoid:**
- Typing `- ` for bullets (creates duplicates when in list mode)
- Typing `## ` for headings inside lists (renders as literal text)
- Using markdown tables (don't render — use nested lists instead)

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

## Adding Images to PR Descriptions (fallback only)

> **Prefer the API.** `bb pr comment --image <file>` and `bb download upload <file>`
> attach images with no browser and no user assistance (see
> `working-with-bitbucket-api`). Use the manual workflow below only when the `bb`
> CLI is genuinely unavailable.

**Limitation**: Browser automation cannot upload files (native file picker, clipboard paste, drag-drop are all inaccessible from automation).

### Workflow (requires user assistance)

1. Enter description edit mode (click body text)
2. Click **Image** button in toolbar
3. Run `open /path/to/images/` to open Finder
4. **Tell user**: "Please drag [filename] into the upload modal"
5. Wait for user confirmation
6. Click on inserted image to select it
7. Click "Add a caption" below image
8. Type caption text
9. Repeat steps 2-8 for each image (modal accepts only 1 image)
10. Click Save

### Key Details

- **One image per upload** — modal closes after each, reopen for next
- **Caption appears only when image selected** — click image first
- **Image toolbar** (when selected): align left/center/right, wrap left/right, copy, delete
- **Markdown tables don't render** — use bullet lists with sub-items instead

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

---

## Advanced: JavaScript Content Injection

For complex descriptions (tables, multiple sections, links), directly inject HTML into ProseMirror:

```javascript
const editor = document.querySelector('.ProseMirror');
editor.innerHTML = `
<h2>Summary</h2>
<p>Description with <strong>formatting</strong> and <a href="...">links</a></p>
<ul>
  <li>Bullet point</li>
  <li>Another point
    <ul><li>Nested item</li></ul>
  </li>
</ul>
`;
editor.dispatchEvent(new Event('input', { bubbles: true }));
```

**When to use:**
- Complex descriptions with tables, nested lists, multiple headings
- Content with many links (commits, tickets, external URLs)
- Avoiding duplicate bullet issues during list entry

**Why this works:**
- Bitbucket uses ProseMirror editor under the hood
- Direct HTML injection bypasses WYSIWYG interaction fragility
- `input` event dispatch triggers Bitbucket's state management

**Note:** Same technique documented in `working-with-jira-web` skill.
