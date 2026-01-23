# handling-pull-requests

Development notes for the PR workflow skill.

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

Session 3: User said "make a PR" (2026-01-22)
- Skill not triggered despite matching triggers
- Claude rationalized: "I know how to do this manually"
- Missing AI signature on comment reply
- No session cleanup (didn't navigate to example.com)
- **Lesson:** Trigger matching works, but AI may still skip skills through rationalization

### Verification

- [ ] "create a PR" triggers this skill
- [ ] "address the review comments" triggers this skill
- [ ] AI comments include signature
- [ ] Platform skills referenced for UI navigation
