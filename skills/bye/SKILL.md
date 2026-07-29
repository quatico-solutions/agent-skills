---
name: bye
description: >-
  Use when the user says /bye, "wrap up", "end session", or similar.
  Reconstructs full session history including compacted context,
  creates a sessionlog (if the project has a sessionlog directory),
  commits changes, and summarizes next steps.
globs: []
license: MIT
metadata:
  author: eins78
  repo: https://github.com/quatico-solutions/agent-skills
  version: 2.1.1
compatibility: Designed for Claude Code and Cursor
---

# Session Wrap-up

## Project-Specific Instructions

If running in a project with a local `CLAUDE.md` or `AGENTS.md`, check for a **"Session Wrap Up"** heading. If found, follow those additional instructions alongside (and in addition to) the steps below. That section is also where the project declares its sessionlog directory — see [sessionlog-template.md](${CLAUDE_SKILL_DIR}/sessionlog-template.md).

## CRITICAL: Restore Full Session History First

**Nothing proceeds until full history is reconstructed.** Context compaction hides earlier work — you must recover it or the sessionlog will be incomplete.

1. Use a subagent to analyze the session file (see [subagent-tasks.md](${CLAUDE_SKILL_DIR}/subagent-tasks.md))
2. Follow the tool-specific restoration guide:
   - **Claude Code:** [claude-code-session-restoration.md](${CLAUDE_SKILL_DIR}/claude-code-session-restoration.md)
   - **Cursor:** [cursor-session-restoration.md](${CLAUDE_SKILL_DIR}/cursor-session-restoration.md)
3. Combine restored history with current context before continuing

If restoration finds **no prior work beyond current context**, proceed — but log that restoration was attempted.

> **Parallel session safety:** The user may have multiple sessions running. Filter by `$CLAUDE_SESSION_ID` and timestamp correlation. Never combine work from other sessions. If uncertain, ASK.

## Session Type Detection

After restoring history, classify the session:

| Signal | Type | Action |
|--------|------|--------|
| `"isSidechain": true` or in `subagents/` dir | Subagent | **STOP** — do not run /bye |
| `messageCount <= 2`, first msg contains `"Context: This summary"` | Metadata session | **SKIP** — not a real work session |
| First messages reference executing a plan; recent file in `~/.claude/plans/` | Plan execution | Read plan file; sessionlog documents execution vs plan |
| System message contains `"Plan mode is active"` | Plan creation | Plan file is the deliverable — **usually skip sessionlog** (see step 3) |
| None of above | Normal | Continue with checklist |

## Session Wrap-up Checklist

1. **Determine scope** — everything between last /bye (or session start) and now. Verify each item was discussed in THIS conversation.
2. **Assess work** — files created, files modified, decisions made, research done, tasks completed, tasks remaining.
3. **Sessionlog needed?** Would anything important be lost if we clear this
   session now? Commits already capture *what* changed and *when*. A sessionlog
   is only worth creating for context not in the committed artifacts.

   | Session produced... | Sessionlog? | Why |
   |---|---|---|
   | Plan file only | **Skip** | Plan file captures everything |
   | Q&A only, no file changes | **Skip** | Nothing to preserve |
   | Code/doc changes with clear commits | **Skip** | Git history tells the story |
   | Feature with decisions, alternatives tried, non-obvious rationale | **Create** | Context not in the code |
   | Single file, but research/intent/sources behind it | **Create** | Log captures the *why* |
   | Plan execution with deviations or partial completion | **Create** | Plan-vs-reality delta is valuable |

   **Project rules override this table.** A documentation or knowledge-layer
   repo may require a sessionlog for every session; if `## Session Wrap Up`
   says so, follow it and skip nothing.

   If skipping, note `**Sessionlog:** Skipped — [reason]` in the final summary.
4. **Sessionlog** — find the directory per [sessionlog-template.md](${CLAUDE_SKILL_DIR}/sessionlog-template.md). If no directory exists, **skip this step entirely** — do NOT create directories. If one exists, create or update the sessionlog per the template.
5. **Update project status** — if work relates to `projects/*/`, update its `status.md`.
6. **Handle git** — see git decision table below.
7. **Print final summary** — see template below.

## Git Decision Table

| Situation | Action |
|-----------|--------|
| Files I created/edited THIS session | Auto-commit |
| Untracked files from before | **ASK** |
| Modified files I didn't touch | **ASK** — likely parallel session |
| .env, credentials, secrets | **NEVER**, warn user |

Commit message: `[Brief description]\n\nSession wrap-up: YYYY-MM-DD`

Push if remote tracking exists.

## Final Summary Template

```
## Session Complete

**Accomplished:**
- [item 1]
- [item 2]

**Committed:** [hash]
- [file list]

**Pending:**
- [ ] [task 1]

**Session:** Reconstructed from N compaction(s) · ~Xk input / ~Yk output tokens
           ↑ only include if compactions > 0; round tokens to nearest k

**Sessionlog:** `sessionlogs/[file].md`

Ready to clear context.
```
