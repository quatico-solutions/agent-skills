# Sessionlog Template

Format and logic for creating or updating sessionlogs. Called from [SKILL.md](${CLAUDE_SKILL_DIR}/SKILL.md) step 4.

## Step 1: Find the Sessionlog Directory

**Declared first.** Read `Sessionlog directory` from the project's
`## Session Wrap Up` section in `CLAUDE.md` or `AGENTS.md`:

```markdown
## Session Wrap Up

- **Sessionlog directory:** docs/sessionlogs/
```

Documentation-style repos that aggregate other repos conventionally use
`sessionlogs/`; code repos `docs/sessionlogs/`, beside `docs/plans/`.

**Undeclared?** Look for `sessionlogs/`, `docs/sessionlogs/`, `changelogs/`,
`docs/changelogs/`. If more than one exists, take the **most populated** — an
abandoned or accidentally created directory must not outrank the real one —
and suggest declaring the key so the next session need not guess.

**One home per unit.** Some repos aggregate several areas and keep a sessionlog
directory per area, at the same relative path (`clients/acme/sessionlogs/`,
`teams/blue/sessionlogs/`). Where those exist, file the log with **the unit
that owns the work** — not the one that happens to hold the code, and not
wherever the last file was touched. Work spanning two or more units belongs at
the repo root. You know what this session was about, including work that
changed no files at all; decide deliberately and say which home you chose.

**One thread, one home.** A continuation goes beside its predecessor, even when
the session touched other units too. Check before writing:

```bash
git ls-files '*sessionlogs/*' | grep -i '<topic-slug>'
```

**No sessionlog directory anywhere in this repository?** **Never create one.**
Do not scaffold, do not guess. But do not go silent either — the work may
deserve a log that lives in a *different* repository:

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null   # a parent workspace
ls -d ../*-workspace ../../*-workspace 2>/dev/null            # a sibling workspace
```

A code repository checked out on its own often keeps its documentation layer in
a companion workspace repo that is neither its parent nor its child. Never
write across a repository boundary on your own initiative — name the candidates
and ask. If there are none, report
`**Sessionlog:** Skipped — no sessionlog directory in this repository` in the
final summary and continue with step 5.

## Step 2: File Naming

`{sessionlog-dir}/YYYY-MM-DD-topic-slug.md` — use today's date via `date +%Y-%m-%d`.

## Template

```markdown
# [Topic]

**Date:** YYYY-MM-DD
**Source:** Claude Code

## Summary
[1-2 sentences: what was accomplished]

## Key Accomplishments
- [Concrete item 1]
- [Concrete item 2]

## Changes Made
- Created: `path/to/file`
- Modified: `path/to/file`

## Decisions
- [Decision 1]: [rationale]

## Next Steps
- [ ] [Pending task 1]
- [ ] [Pending task 2]

## Repository State
- Committed: [hash] - [message]
- Branch: [branch name]
```

## Create vs Update

**Create new** when no sessionlog exists for this work.

**Update existing** when a sessionlog was created earlier in this session (e.g., before compaction) and more work was done after. Steps:
1. Read the existing sessionlog
2. Append new accomplishments/changes
3. Update "Next Steps" and "Repository State"

## Finding Existing Sessionlogs

Search every home, not just the one you are about to write to — a continuation
belongs beside its predecessor (Step 1).

```bash
# Every sessionlog this repo tracks, in any home
git ls-files '*sessionlogs/*' '*changelogs/*'

# Recent ones
git ls-files '*sessionlogs/*' | sort | tail -5

# From today
git ls-files '*sessionlogs/*' | grep "$(date +%Y-%m-%d)"
```

When unsure, ask: "Should I create a new sessionlog or update `<path>`?"

## Plan Session Handling

**Plan execution session:**
- Sessionlog documents what was EXECUTED, not what was planned
- Add a "Plan Reference" section:

```markdown
## Plan Reference
- Plan: `~/.claude/plans/{slug}.md`
- Planned: [summary from plan]
- Executed: [what was actually done]
```

**Plan creation session:**
- The plan file IS the deliverable
- Sessionlog documents the planning work, not implementation
- Reference the plan file location
