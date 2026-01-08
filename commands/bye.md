# Session Wrap-up

Wrap up this session safely: document accomplishments, persist open tasks, handle git commits, and summarize next steps.

## Process

### Step 1: Assess the Session

Review what was accomplished:
- What files were created or modified?
- What decisions were made?
- What tasks were completed?
- What's still pending?

Determine if this was **meaningful work**:
- Files created or modified
- Research worth preserving
- Decisions affecting future work
- Tasks completed or progressed

If trivial (just Q&A, quick lookups, no changes), ask whether to create a changelog.

### Step 2: Update Documentation

#### Changelog (if meaningful work)

Create `changelogs/YYYY-MM-DD-topic-slug.md` using today's date:

```markdown
# [Topic]

**Date:** YYYY-MM-DD
**Source:** Claude Code

## Summary
[1-2 sentences on what was accomplished]

## Key Accomplishments
- [Item 1]
- [Item 2]

## Changes Made
- Created: `path/to/file`
- Modified: `path/to/file`

## Next Steps
- [Pending task 1]
- [Pending task 2]

## Repository State
- Committed: [summary]
- Branch: [branch name]
```

#### Project Status (if applicable)

If work relates to a project in `projects/`, update its `status.md` with:
- Current phase/status
- Completed tasks from this session
- New pending tasks

### Step 3: Handle Git

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

### Step 4: Summarize & Confirm

Present to user:

1. **Accomplished this session:**
   - [List of completions]

2. **Pending next steps:**
   - [List of remaining tasks]

3. **Files committed:**
   - [List of committed files]

4. **Safe to clear context?**
   - Confirm all important information is persisted
   - Note any follow-up needed

---

**Important:** If unsure about any git changes (parallel work concern), always ask before committing.
