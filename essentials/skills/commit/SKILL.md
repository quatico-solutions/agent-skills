---
name: commit
description: >-
  When and what to commit. Covers timing, atomic commits, and git hooks.
  Use when: making commits, deciding when to commit, preparing changes.
  Triggers: commit, commit this, commit changes, git commit, make commit, should I commit.
  Related: commit-notation (message formatting), handling-pull-requests (PR workflow).
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.0.0"
---

# Commit

## When to Commit

**Commit when a unit of work is done and verified.**

A commit marks a checkpoint where:
- The task is complete (not "mostly done")
- Tests pass (or you've verified manually for untested code)
- The change works as intended

**Don't commit:**
- As a save point ("I'll fix it later")
- Incomplete work (use branches/stash instead)
- Before verifying the change works

## One Concern per Commit

Each commit should have **one clear intention**. Ask: "What does this commit do?" If the answer uses "and", split it.

| ✓ One Concern | ✗ Mixed Concerns |
|---------------|------------------|
| Add login endpoint | Add login endpoint and fix typos |
| Extract helper function | Refactor and add new feature |
| Update dependencies | Update deps and fix bug they exposed |
| Format code (auto) | Format code and change logic |

## What Belongs Together

A single concern often spans multiple files:

- **Feature**: implementation + tests + docs for that feature
- **Bugfix**: fix + regression test proving it's fixed
- **Refactoring**: all files affected by the structural change

The test is: "Would reverting this commit leave the codebase in a coherent state?"

## What Must Be Separate

Never bundle these with functional changes:

| Change Type | Why Separate |
|-------------|--------------|
| Formatting/linting | Obscures real changes in diff |
| Dependency updates | Separate risk, separate rollback |
| Unrelated fixes | Different concerns, different tickets |

If you discover an unrelated issue while working: **stash it, finish your task, commit, then fix the other issue separately.**

## Git Hooks

Most projects use pre-commit hooks (often via Husky) that run linting, tests, or formatting.

**When hooks fail:** Fix the issue. Hooks exist to catch problems early.

**Skipping hooks (`--no-verify`):**
- **NEVER without explicit human approval**
- Ask: "Hooks are failing because [reason]. Should I skip them with --no-verify?"

**Valid reasons to skip:**
- Rebasing/squashing where hooks will re-run on final commit
- Emergency hotfix that must reach CI immediately
- Infrastructure changes where hooks are incompatible (e.g., pre-push hook can't run without remote)

**Invalid reasons:**
- "Hooks are slow"
- "I'll fix lint errors later"
- "Just this once"

## Message Format

Use **commit-notation** skill for message formatting (Arlo's notation with Quatico extensions).
