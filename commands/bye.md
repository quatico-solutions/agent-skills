# Session Wrap-up

End this session cleanly: reconstruct what happened, document it, commit changes, summarize next steps.

---

## CRITICAL: Parallel Session Safety

**The user may have multiple sessions running simultaneously.**

You MUST identify THIS session only. Never combine work from parallel sessions.

### Claude Code

**How to identify this session:**
1. Check `$CLAUDE_SESSION_ID` environment variable (if available)
2. Look at the conversation flow - what did the USER ask in THIS conversation?
3. When checking logs/memory, filter by session ID or timestamp correlation

**Finding session data files:**
```bash
# Get the project path (varies by machine)
PROJECT_PATH=$(pwd | tr '/' '-' | sed 's/^-//')
echo "Session data: ~/.claude/projects/$PROJECT_PATH/"

# Or find directly
ls -la ~/.claude/projects/ | grep "$(basename $(pwd))"
```

### Cursor

No session ID environment variable is available. Rely on:
1. The conversation flow in THIS chat window
2. Workspace context shown in the chat
3. Git timestamps to correlate changes

**If uncertain about session boundaries:** ASK before including any work.

---

## Step 1: Reconstruct Full History

### Claude Code Only

**Check the FIRST system message in this conversation for these patterns:**

#### Pattern A: Compacted Session

If you see this at the start:
> "This session is being continued from a previous conversation that ran out of context"

→ **Action:** The embedded summary IS your history. Read it carefully—it contains the complete prior conversation in `User:` / `Agent:` blocks.

**DO NOT** try to read JSONL files. The summary is already here.

#### Pattern B: Plan Execution Session

If you see a message ending with:
> "If you need specific details from before exiting plan mode... read the full transcript at:
> `/path/to/session.jsonl`"

→ **Action:** The JSONL file is usually too large for the Read tool. Use this jq command:

```bash
# Extract user messages and assistant responses (adapt path from the message)
jq -r 'select(.type == "user" or .type == "assistant") |
  if .type == "user" then "USER: " + (.message.content // .content | tostring)
  else "CLAUDE: " + (.message.content // .content | tostring | .[0:500]) + "..."
  end' /path/to/session.jsonl | head -100
```

If jq is not available, use grep:
```bash
# Quick summary of user messages only
grep '"type":"user"' /path/to/session.jsonl |
  grep -o '"content":"[^"]*"' |
  head -20
```

#### Pattern C: Normal Session

No special patterns at start → This conversation IS the full history.

### Cursor Only

No compaction or plan mode. The conversation in the chat window IS the full history.

### Shared: Git History

After identifying session type, check recent commits (may include parallel session work):
```bash
git log --oneline -20
```

---

**After reconstruction, you should know:**
- [ ] What the user originally requested
- [ ] What decisions were made and why
- [ ] What files were created/modified
- [ ] What's done vs what's pending

---

## Step 2: Determine Session Scope

**Goal:** Find exactly what work belongs to THIS session, nothing more.

### Find Session Boundaries

Look for:
- Previous `/bye` command in THIS conversation
- Session start (first user message)
- Compaction boundaries (Claude Code)

**Scope = everything between last /bye (or session start) and now**

### Parallel Session Check

Before including any work, verify:
- Did THIS conversation request/discuss this work?
- Do timestamps align with THIS session?
- Could this be from a parallel session?

**If you find work you don't remember discussing:** ASK
> "I found [X] in the logs. Was this from our session or a parallel one?"

---

## Step 3: Assess the Work

For work confirmed as THIS session:

1. **Files created** - new files
2. **Files modified** - changes to existing files
3. **Decisions made** - choices affecting future work
4. **Research done** - information worth preserving
5. **Tasks completed** - items finished
6. **Tasks remaining** - work left to do

**Trivial session?** (just Q&A, no changes)
→ Ask: "This session had no significant changes. Skip changelog?"

---

## Step 4: Handle Git

```bash
git status
git diff --stat
```

| Situation | Action |
|-----------|--------|
| Files I created/edited THIS session | Auto-commit |
| Untracked files from before | **ASK** |
| Modified files I didn't touch | **ASK** - likely parallel session! |
| .env, credentials, secrets | **NEVER**, warn user |

**Commit message format:**
```
[Brief description of changes]

Session wrap-up: [date]
```

Push if on a branch with remote tracking.

---

## Step 5: Check for Changelog Convention

Look for existing changelogs:
- `changelogs/` directory
- `CHANGELOG.md` file
- Similar patterns in the repo

**If changelogs exist:** Follow the project's convention and create an entry.

**If no changelogs exist:** Do NOT create one. Skip to Step 6.

### Claude Code Only: Plan Session Changelogs

**If plan EXECUTION session (context was auto-cleared after plan approval):**
- The plan file documents the previous session's work (planning)
- Changelog should document EXECUTION: what was actually done
- Reference the plan file in the changelog

**If plan CREATION session:**
- The plan file IS the deliverable
- Changelog documents the planning work, not implementation

---

## Step 6: Session Summary

Create a comprehensive summary containing **everything not persisted in the repo**:

```markdown
# Session Summary — [Date]

## What We Accomplished
- [Completed task 1]
- [Completed task 2]

## Key Decisions & Rationale
- [Decision]: [Why we chose this approach]

## Changes Committed
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

---

## Step 7: Final Message

Always end with:

> **No changelog was created.** Copy this summary to your notes if you want to reference it later—it won't be saved anywhere in the repo.

If written to temp file:

> Summary saved to `[path]`. This file will be deleted on reboot.

---

## Rules

1. **Never mix parallel sessions** - verify before including any work
2. **Never guess scope** - ask if uncertain
3. **Check all sources** - conversation, memory, logs (tool-specific)
4. **Never auto-commit ambiguous files** - could be parallel session work
5. **Always push** if remote tracking exists
