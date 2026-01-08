# Session Wrap-up

Wrap up this session safely: handle git commits, document accomplishments, and summarize everything the user needs to remember.

## Process

### Step 1: Assess the Session

Review what was accomplished:
- What files were created or modified?
- What decisions were made and why?
- What tasks were completed?
- What's still pending?
- What knowledge was gained that isn't captured in code?

### Step 2: Handle Git

Run `git status` and apply these rules:

| File Type | Action |
|-----------|--------|
| Created this session | Auto-commit |
| Edited this session | Auto-commit |
| Untracked, existed before | Ask user |
| Modified but not by this session | Ask user (parallel work!) |
| .env, credentials, secrets | NEVER commit, warn user |

**Commit message format:**
```
[Brief description of changes]

Session wrap-up: [date]
```

Push if on a branch with remote tracking.

### Step 3: Check for Changelog Convention

Look for existing changelogs:
- `changelogs/` directory
- `CHANGELOG.md` file
- Similar patterns in the repo

**If changelogs exist:** Follow the project's convention and create an entry.

**If no changelogs exist:** Do NOT create one. Skip to Step 4.

### Step 4: Session Summary

Create a comprehensive summary containing **everything not persisted in the repo**:

```markdown
# Session Summary — [Date]

## What We Accomplished
- [Completed task 1]
- [Completed task 2]

## Key Decisions & Rationale
- [Decision]: [Why we chose this approach]
- [Decision]: [Trade-offs considered]

## Changes Committed
- `path/to/file` — [what changed]
- `path/to/file` — [what changed]

## Open Questions / Unresolved
- [Question or uncertainty]

## Next Steps
- [ ] [Pending task 1]
- [ ] [Pending task 2]

## Context for Future Sessions
[Any important background, gotchas, or things to remember]
```

**Output rules:**
- If summary ≤ 50 lines: Display directly in chat
- If summary > 50 lines: Write to `/tmp/session-summary-[date].md` and tell the user the path

### Step 5: Final Message

Always end with:

> **No changelog was created.** Copy this summary to your notes if you want to reference it later—it won't be saved anywhere in the repo.

If written to temp file, add:

> Summary saved to `[path]`. This file will be deleted on reboot.

---

**Important:** The summary is the user's only record of this session's context. Make it thorough. Include decisions, reasoning, and anything they'd need to resume work later.

**Important:** If unsure about any git changes (parallel work concern), always ask before committing.
