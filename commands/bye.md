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

## Step 1: Reconstruct Session History

**Problem:** Context may have been compacted (auto-summarized). You need the full picture.

### Shared Sources

1. **This conversation** - Read backward through all messages
2. **Git history** - `git log --oneline -20` (beware: may include parallel session commits!)

### Claude Code Only

3. **Compaction summaries** - Messages containing "Here is a summary of our conversation so far"
4. **Episodic memory** - Check `~/.claude/episodic-memory/` for recent entries
5. **Session logs** - Check `~/.claude/logs/` for this session's activity

```bash
# Find today's logs
ls -la ~/.claude/logs/ | tail -20

# Check episodic memory
ls -la ~/.claude/episodic-memory/ | tail -10
```

**When reading logs:** Match timestamps and session IDs to THIS conversation.

### Cursor Only

3. **Chat history** - Stored in SQLite databases (platform-specific):
   - macOS: `~/Library/Application Support/Cursor/User/workspaceStorage/`
   - Linux: `~/.config/Cursor/User/workspaceStorage/`
   - Windows: `%APPDATA%\Cursor\User\workspaceStorage\`
4. **Use `/summarize` output** if you ran it earlier in the session

---

## Step 1b: Detect Session Type

### Claude Code Only

**Run these checks IN ORDER to classify this session:**

#### Check 1: Am I in a subagent?

Subagents should NOT run /bye - they are child work sessions.

Detection:
- Session file is in a `subagents/` directory
- Session JSON contains `"isSidechain": true`

If subagent → **STOP**. Do not proceed with /bye.

#### Check 2: Is this a metadata-only session?

Compaction creates short "metadata" sessions (2 messages) just to generate summaries.

Detection:
- `messageCount <= 2` in sessions-index.json
- First message contains `"Context: This summary will be shown"`

If metadata session → **SKIP** /bye wrap-up. These aren't real work sessions.

#### Check 3: Does this conversation contain compaction?

Compaction embeds prior conversation in summary messages.

Detection - look for messages containing:
- `"Context: This summary will be shown"` AND `"Please write a concise, factual summary"` (single compaction)
- `"Context: This summary will be shown"` AND `"synthesizes these part-summaries"` (multi-part synthesis)
- Embedded `User:` / `Agent:` / `---` blocks (conversation transcript format)

If found → **Compaction detected**. Parse the embedded transcript:
```
User: [their message]
Agent: [response]
---
User: [next message]
...
```

#### Check 4: Is this a plan EXECUTION session?

When you accept a plan, Claude Code **auto-clears context** so the plan executes fresh.

Detection:
- First messages reference a plan file or "execute the plan"
- System message references `~/.claude/plans/*.md`
- Session starts with implementation work without prior planning discussion

```bash
# Check for recent plan files
ls -lt ~/.claude/plans/ | head -5
```

If found → **Plan execution session**. Read the plan file to understand what was PLANNED vs what was DONE.

#### Check 5: Is this a plan CREATION session?

Detection:
- System message contains `"Plan mode is active"`
- Session focused on analysis and planning, not implementation

If found → **Plan mode session**. The plan file IS the deliverable.

#### Check 6: Normal session

None of the above → Standard session. Continue with existing logic.

### Cursor

Skip this section - these session types (subagent, compaction transcripts, plan mode auto-clear) don't apply to Cursor.

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

---

## Subagent Instructions (for long/compacted sessions)

### Claude Code Only

When the conversation is too long to analyze directly, use subagents:

#### Subagent Task: Analyze Session File

```
Use Task tool with subagent_type=Explore:
prompt: |
  Analyze the session file to determine session type.

  Session file location:
  ~/.claude/projects/{project-path-encoded}/{session-id}.jsonl

  To find the project path:
  PROJECT_PATH=$(pwd | tr '/' '-' | sed 's/^-//')
  ls ~/.claude/projects/$PROJECT_PATH/

  Steps:
  1. Find the session file using the project path above
  2. Read first 10 lines of the JSONL file
  3. Look for these patterns:
     - "Context: This summary will be shown" → compaction
     - "Plan mode is active" → plan mode
     - "isSidechain": true → subagent (skip)
  4. Return:
     - session_type: "compaction" | "plan_mode" | "plan_execution" | "normal" | "subagent"
     - work_summary: 2-3 sentences of what happened
     - files_mentioned: list of file paths discussed
```

#### Subagent Task: Detect Plan Execution Session

```
Use Task tool with subagent_type=Explore:
prompt: |
  Determine if this is a plan EXECUTION session (auto-cleared after plan approval).

  Steps:
  1. List ~/.claude/plans/ - find files modified in the last 2 hours
  2. Check first few messages of current conversation:
     - Do they reference executing/implementing a plan?
     - Is there implementation work without prior planning discussion?
  3. If plan file found, read it and extract:
     - Verification checklist items
     - Files to be modified
  4. Return:
     - is_plan_execution: true/false
     - plan_path: path to plan file (if found)
     - plan_summary: what was planned
```

#### Subagent Task: Parse Compaction Transcript

```
Use Task tool with subagent_type=Explore:
prompt: |
  Parse the compaction summary transcript.

  The compaction message contains conversation in this format:
  User: [their message]
  Agent: [claude's response]
  ---
  User: [next message]
  ...

  Steps:
  1. Extract each User/Agent exchange
  2. Identify: files created, files modified, decisions made
  3. Return:
     - exchanges_count: number of User/Agent pairs
     - files_created: list of new files
     - files_modified: list of changed files
     - key_decisions: list of choices made
```
