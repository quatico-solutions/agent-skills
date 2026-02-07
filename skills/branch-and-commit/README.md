# branch-and-commit

Development notes for the intelligent commit organization and branch creation skill.

## Overview

Automates the workflow of analyzing uncommitted changes, grouping them into atomic commits with proper Arlo notation, creating feature branches, and preparing for PRs.

**Key innovation:** Conducts in-depth interview before grouping to uncover missing changes, edge cases, and better commit organization.

## Design Decisions

### 1. Interview Before Grouping

**Decision:** Phase 2 is interview, Phase 3 is grouping (not the reverse)

**Rationale:**
- Interview reveals missing changes before commits are organized
- Uncovers dependencies that affect grouping decisions
- Provides context for better risk assessment
- Prevents regrouping after discovering issues

**Alternative considered:** Group first, then interview to refine
- **Rejected:** Would require regrouping, creates churn
- Interview provides context that informs initial grouping

### 2. Delegation to `/commit-notation`

**Decision:** Invoke `/commit-notation` skill for each commit group to determine risk level

**Rationale:**
- Avoids reimplementing complex risk logic (lowercase vs UPPERCASE vs !!)
- Ensures 100% consistency with manual commits
- Automatically benefits from future updates to `/commit-notation`
- Single source of truth for risk determination

**Alternative considered:** Reimplement risk logic in this skill
- **Rejected:** Code duplication, divergence risk, maintenance burden

### 3. Provably Safe Commits Can Span Many Files

**Decision:** Lowercase commits (a, r, d, e, t, c) are NOT split by file count

**Rationale:**
- IDE renames touching 50 files are provably safe (type-checked)
- Typo fixes across 10 docs are provably safe (no logic change)
- Splitting creates noise, obscures the atomic nature of the change
- Reviewers benefit from seeing all related changes together

**Alternative considered:** Split any commit >10 files
- **Rejected:** Artificially splits atomic changes, creates review overhead

### 4. Two-Step PR Workflow

**Decision:** First ask "Need PR description?", then "How to provide?"

**Rationale:**
- User might want commits without PR preparation
- User might want description to edit before creating PR
- User might want to create PR manually

**Alternative considered:** Single question "Create PR?"
- **Rejected:** Doesn't allow for intermediate states (generate but don't create)

### 5. Security Checks in Phase 1

**Decision:** Scan diffs for sensitive data before grouping

**Rationale:**
- Prevents accidentally committing credentials
- Nearly impossible to fully remove from git history once committed
- Early detection allows user to exclude file or confirm it's safe

**Alternative considered:** Scan during execution (Phase 8)
- **Rejected:** Too late, user has already confirmed commits by then

### 6. Project Override: `#` Ticket Prefix

**Decision:** Use `#FOO-123` format instead of Quatico standard `FOO-123`

**Rationale:**
- This project's existing convention (documented in plan)
- Consistency with existing commits
- Git doesn't treat `#` as comment in commit message body (only first line)

## Implementation Patterns

### Skill Tool Invocation

```typescript
// For each commit group, invoke /commit-notation
const context = {
  intention: "F",
  filesChanged: 2,
  linesOfCode: 15,
  testCoverage: "Unit tests added and passing",
  changeNature: "Added email validation function",
  toolAssisted: "Manual implementation"
};

// Use Skill tool with structured context
// skill: "commit-notation"
// args: "<context as formatted text>"

// Parse response for annotation (e.g., "F", "a", "R!!")
```

### Interview Question Pattern

```typescript
// Use AskUserQuestion with 2-4 contextual questions
{
  questions: [
    {
      question: "How should the system handle token refresh when user has multiple tabs open?",
      header: "Multi-tab auth",
      multiSelect: false,
      options: [
        { label: "Sync across tabs", description: "..." },
        { label: "Independent refresh", description: "..." },
        { label: "Single leader tab", description: "..." }
      ]
    }
  ]
}
```

## Testing History

### Test Scenarios Verified

1. ✅ Simple feature (1 file pair) → 1 commit
2. ✅ Mixed changes (E, F, D) → 3 commits in correct order
3. ✅ IDE rename (50 files) → 1 lowercase commit (not split)
4. ✅ Typo fix (10 docs) → 1 lowercase commit
5. ✅ Interview reveals missing change → Added to commit
6. ✅ Interview question quality (contextual, not obvious)
7. ✅ Security check (API key detected, stops workflow)
8. ✅ Large file handling (5000 lines, skips detailed analysis)

### Edge Cases Documented

- Git command failures → Show error, ask user
- Commit hooks fail → Never use `--no-verify` without permission
- Branch already exists → Ask user to rename or switch
- No changes detected → Offer to check stash
- Sensitive data detected → STOP, show redacted, get confirmation
- Large files (>1000 lines) → Categorize by path only
- Mixed intentions in same file → Try `git add -p`, ask user
- Multiple tickets → Group by ticket, separate commits

## Known Limitations

1. **Uncommitted changes only**
   - Does NOT split or rebase existing commits
   - Does NOT amend published commits
   - Only works with working directory changes

2. **No automatic git worktree support**
   - User must manually switch worktrees before running
   - Could be enhanced to offer worktree creation

3. **No dry-run mode**
   - Shows proposed commits but requires confirmation
   - Could add `--dry-run` flag to preview without executing

4. **No interactive commit message editing**
   - Generates commit messages automatically
   - Could add option to edit messages before committing

## Future Enhancements

### Potential Improvements

1. **Automatic related file detection**
   - Find all imports of renamed function
   - Suggest including related test files

2. **Support for commit splitting**
   - Split existing commits by intention
   - Interactive rebase assistance

3. **Dry-run mode**
   - `--dry-run` flag to preview without executing
   - Generate commit messages without creating commits

4. **Interactive message editing**
   - Allow user to edit commit messages before execution
   - Preserve generated structure while allowing customization

5. **Worktree integration**
   - Offer to create worktree for feature branch
   - Automatic cleanup after PR merge

## Version History

### v1.1 (Current)

- ✅ Security checks (API keys, AWS credentials, private keys)
- ✅ Error handling (8 scenarios documented)
- ✅ Implementation notes (tools, flow, patterns)
- ✅ Large file handling (>1000 lines)
- ✅ Interview moved to Phase 2 (before grouping)
- ✅ Explicit Skill tool invocation examples

### v1.0 (Initial)

- ✅ Core workflow (9 phases)
- ✅ In-depth interview phase
- ✅ Delegation to `/commit-notation`
- ✅ Provably safe commits can span many files
- ✅ Two-step PR workflow
- ✅ Project override for ticket format

## References

**Related skills:**
- `/commit-notation` - Risk level determination (invoked by this skill)
- `/commit` - Atomic commit principles
- `/handling-pull-requests` - PR creation workflow

**Implementation plan:**
- Original plan document contains detailed requirements and success criteria
- All requirements from plan have been implemented and verified
