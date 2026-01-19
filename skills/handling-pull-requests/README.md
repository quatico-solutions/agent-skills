# handling-pull-requests

Platform-agnostic PR workflow skill for Claude Code and Cursor.

## Purpose

Guides the high-level PR workflow:
- When to create PRs
- How to address review feedback
- When to reply vs resolve comments
- AI signature conventions

Does NOT cover platform-specific UI navigation (see `working-with-bitbucket-web`).

## Design Rationale

### Two-Skill Architecture

Separated from `working-with-bitbucket-web` because:
1. **Workflow is platform-agnostic** — same process for Bitbucket, GitHub, GitLab
2. **UI mechanics are platform-specific** — different buttons, rich text editors
3. **Better trigger matching** — "create PR" triggers workflow skill, "bitbucket" triggers UI skill

### Trigger Selection

Based on observed failures:
- "make a new PR" → missed by `working-with-bitbucket-web` (no action verbs)
- Added: "create PR", "open PR", "new PR", "make PR", "address feedback"

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial version, split from working-with-bitbucket-web |

## Testing Notes

### Baseline Failures (Pre-skill)

Session 1: User said "make a new PR"
- Skill not triggered (missing action verbs)
- Claude typed `- ` for bullets → duplicate bullets
- No signature on AI comments

Session 2: User said "check this PR"
- Skill loaded, but needed handholding for:
  - AI signature (`🤖 – Claude`)
  - Comment reply workflow
  - List formatting in rich text editor

### Verification

- [ ] "create a PR" triggers this skill
- [ ] "address the review comments" triggers this skill
- [ ] AI comments include signature
- [ ] Platform skills referenced for UI navigation
