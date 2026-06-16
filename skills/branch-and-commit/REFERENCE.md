# Branch and Commit Reference

> **Detailed categorization rules, heuristics, and examples for the branch-and-commit skill.**

## Table of Contents

- [File Categorization](#file-categorization)
- [Security Checks](#security-checks)
- [Intention Detection](#intention-detection)
- [Risk Level Context](#risk-level-context)
- [Grouping Rules](#grouping-rules)
- [Ordering Rules](#ordering-rules)
- [Interview Question Patterns](#interview-question-patterns)
- [Edge Cases](#edge-cases)

## File Categorization

### By Path Pattern

| Pattern | Category | Example |
|---------|----------|---------|
| `**/*.spec.ts` | TEST | `src/auth.spec.ts` |
| `**/*.test.ts` | TEST | `src/utils.test.ts` |
| `**/*.md` | DOCS | `README.md`, `docs/api.md` |
| `docs/**/*` | DOCS | `docs/guides/setup.md` |
| `*.json` | CONFIG | `package.json`, `tsconfig.json` |
| `*.yml`, `*.yaml` | CONFIG | `.github/workflows/ci.yml` |
| `.env*` | CONFIG | `.env.local` |
| `tsconfig.*` | CONFIG | `tsconfig.build.json` |
| `**/*.ts`, `**/*.tsx` | SOURCE | `src/auth.ts` |
| `**/*.js`, `**/*.jsx` | SOURCE | `src/utils.js` |

### By Diff Content

**Import-only changes:**
```bash
# All added/removed lines are imports
git diff <file> | grep -v "^[+-]import\|^[+-]require" | grep "^[+-]" | wc -l
# Result: 0 → imports only
```

**Comment-only changes:**
```bash
# All added/removed lines are comments
# Check for patterns: //, /*, */, #
```

**Mixed changes:**
- Both imports and code
- Both comments and code
- Complex refactoring

## Security Checks

Before proceeding with grouping, scan diffs for sensitive data that should not be committed.

### Patterns to Detect

| Pattern | Example | Risk |
|---------|---------|------|
| API Keys (long alphanumeric) | `[A-Z0-9]{32,}` | HIGH |
| AWS Access Keys | `AKIA[A-Z0-9]{16}` | CRITICAL |
| Private Keys | `-----BEGIN.*PRIVATE KEY-----` | CRITICAL |
| Password Variables | `(password\|PASSWORD)\s*=\s*['"].*['"]` | HIGH |
| Token Variables | `(token\|TOKEN\|bearer\|BEARER)\s*=\s*['"].*['"]` | HIGH |
| Secret Variables | `(secret\|SECRET\|api_key\|API_KEY)\s*=\s*['"].*['"]` | HIGH |

### Detection Strategy

```bash
# Scan each changed file's diff
for file in $(git diff --name-only HEAD); do
  # Get diff content
  diff=$(git diff HEAD -- "$file")

  # Check for patterns
  if echo "$diff" | grep -qE 'AKIA[A-Z0-9]{16}'; then
    warn "Potential AWS key in $file"
  fi

  if echo "$diff" | grep -qE '-----BEGIN.*PRIVATE KEY-----'; then
    warn "Potential private key in $file"
  fi

  # Long alphanumeric strings (likely API keys)
  if echo "$diff" | grep -qE '[A-Z0-9]{32,}'; then
    warn "Potential API key in $file"
  fi
done
```

### When Sensitive Data is Found

**DO:**
1. **STOP** immediately (don't proceed to grouping)
2. Show file path and line number
3. Show redacted pattern: `Potential AWS key (AKIA...)`
4. Ask user: "This looks sensitive. Options:"
   - Exclude this file from commits
   - It's safe (test data/example)
   - Abort and let me remove it

**DON'T:**
- Show the full sensitive value
- Automatically exclude the file
- Proceed to grouping without user confirmation
- Log the sensitive value

### False Positives

**Common safe patterns:**
- Test data: `const EXAMPLE_API_KEY = "AKIAIOSFODNN7EXAMPLE";`
- Documentation examples
- Placeholder values: `YOUR_API_KEY_HERE`

**Ask user to confirm:**
- "This looks like an API key in `src/config.ts:12`. Is this test data or a real key?"

### Large Files (>1000 Lines)

**Don't analyze line-by-line:**
- `package-lock.json` (5000 lines)
- `dist/bundle.js` (10000 lines)
- Generated files

**Instead:**
1. Show: "`<file>` changed (X lines)"
2. Categorize by path pattern only
3. Ask: "Categorize as `<intention>` based on path?"

**Rationale:**
- Large diffs are slow to analyze
- Usually auto-generated (no manual secrets)
- Path pattern is sufficient

## Intention Detection

### Feature (F) vs Bugfix (B)

**Bugfix indicators:**
```bash
# Keywords in diff
git diff <file> | grep -iE "fix|bug|error|crash|issue|repair|broken|defect"

# Ticket number pattern
ticket =~ /BUG-\d+|BUGFIX-\d+|FIX-\d+/
```

**Feature indicators:**
```bash
# New files
git status --porcelain | grep "^A "

# New functions/classes
git diff <file> | grep "^+.*function\|^+.*class\|^+.*export"

# Ticket number pattern
ticket =~ /FEAT-\d+|FEATURE-\d+|STORY-\d+/
```

**If unclear:** Ask user during interview phase

### Refactoring (R) vs Automated (A)

**Refactoring (R):**
- Specific, named structural changes
- Extract method/function
- Inline variable
- Rename class/method
- Move file/module
- No behavior change (tests don't change logic)

**Automated (A):**
- Bulk operations
- Formatter output (Prettier, ESLint --fix)
- Tool-generated code
- Import updates after file move
- Mass rename via IDE

**Detection:**
```bash
# Import-only → A
# Check if all changes are imports

# Check commit message or ask user:
# "Was this IDE-assisted?" → A if yes
# "Is this a structural change?" → R if yes
```

### Test-only (T)

**Criteria:**
- File is test file (`.spec.ts`, `.test.ts`)
- No source files in same commit group
- Only test code changed

**Detection:**
```bash
path =~ /\.(spec|test)\.(ts|js|tsx|jsx)$/
# AND no non-test files in group
```

### Documentation (D)

**Criteria:**
- Markdown files
- README files
- Documentation directories
- No code changes

**Detection:**
```bash
path =~ /\.md$|^docs\/|^README/
```

### Environment (E)

**Criteria:**
- Config files
- Dependencies (package.json)
- Build configuration
- CI/CD configuration
- Environment files

**Detection:**
```bash
path =~ /\.(json|yml|yaml)$|package\.json|tsconfig|\.env|\.github/
```

### Comment (C)

**Criteria:**
- Only comments changed
- No code logic changed
- JSDoc/JavaDoc counts as D (documentation), not C

**Detection:**
```bash
# All added/removed lines are comments
git diff <file> | grep "^[+-]" | grep -v "^[+-].*//\|^[+-].*\/\*\|^[+-].*\*\/"
# Result: empty → comment-only
```

## Risk Level Context

**When invoking `/commit-notation`, provide:**

### Context Template

```
Intention: [F/B/R/D/T/E/A/C]
Files changed: [count]
Lines of code: [added + removed]
Test coverage: [tests exist? tests pass?]
Change nature: [describe what changed]
Tool-assisted: [IDE refactoring? manual edit?]
```

### Example Contexts

**IDE rename:**
```
Intention: R
Files changed: 50
Lines of code: 150
Test coverage: All existing tests pass
Change nature: Renamed method 'getUserData' to 'fetchUserProfile' across codebase
Tool-assisted: IDE refactoring (TypeScript auto-update)
```

**Small feature:**
```
Intention: F
Files changed: 2 (src/auth.ts, src/auth.spec.ts)
Lines of code: 6
Test coverage: Unit tests added and passing
Change nature: Added email validation function
Tool-assisted: Manual implementation
```

**Large feature:**
```
Intention: F
Files changed: 8
Lines of code: 50
Test coverage: Integration tests exist
Change nature: Added authentication flow with token refresh
Tool-assisted: Manual implementation
```

**Typo fix:**
```
Intention: D
Files changed: 10
Lines of code: 10
Test coverage: N/A (documentation)
Change nature: Fixed typo 'recieve' → 'receive' across docs
Tool-assisted: Find-and-replace
```

## Grouping Rules

### What Belongs Together

1. **Feature/Bugfix + Tests:**
   - Implementation file
   - Test file
   - Single commit

2. **Related Refactorings:**
   - All files affected by structural change
   - Example: Extract method used in 3 places → all 3 files in one commit

3. **Dependency + First Use:**
   - Add dependency (E)
   - First feature using it (F)
   - Keep separate commits

### What Must Be Separate

1. **Different intentions:**
   - Feature ≠ Refactoring
   - Documentation ≠ Feature
   - Config ≠ Source

2. **Different tickets:**
   - FOO-123 ≠ FOO-124
   - Separate commits even if same intention

3. **Automated vs Manual:**
   - Formatter run (A) ≠ Feature (F)
   - Import updates (a) ≠ Refactoring (R)

### Provably Safe Changes Can Span Many Files

**Lowercase commits can include many files:**

```bash
# OK: 50 files in one commit
a Rename getUserData to fetchUserProfile
# Why: IDE-assisted, type-checked, provably safe

# OK: 100 files in one commit
a Update imports after moving UserService
# Why: Tool-generated, compiler-verified

# OK: 10 files in one commit
d Fix typo: recieve → receive
# Why: Simple typo, no logic change
```

**UPPERCASE commits should be small:**

```bash
# Prefer: Split into multiple commits
F: Add email validation
F: Add password validation

# Over: Large risky commit
F!! Add email and password validation
# Why: Easier to review, easier to revert
```

## Ordering Rules

### Priority Sequence

1. **e/E** (Environment)
   - Dependencies
   - Config changes
   - Build setup
   - **Why first:** Foundation for other changes

2. **a** (Automated, provable)
   - IDE renames
   - Import updates
   - Tool-generated
   - **Why second:** Safe, clears noise, can touch many files

3. **r/R** (Refactoring)
   - Structural changes
   - Prep for features
   - **Why third:** Prepares ground for behavior changes

4. **t/T** (Test-only)
   - Standalone test changes
   - **Why here:** Test infrastructure before features

5. **F/B** (Features/Bugfixes)
   - Main behavioral changes
   - In dependency order
   - **Why here:** Main review focus, reviewers see clean code

6. **A** (Automated, validated)
   - Formatter runs
   - Bulk linting
   - **Why late:** Doesn't obscure features, already validated

7. **d/D** (Documentation)
   - Standalone docs
   - **Why late:** Can reference completed features

8. **c/C** (Comments)
   - Comment-only changes
   - **Why last:** Least critical, can reference completed work

### Dependency Order Within Categories

If multiple F commits exist, order by dependency:

```bash
# Correct order
F: Add User model
F: Add authentication using User model
F: Add authorization using authentication

# Wrong order (reversed dependency)
F: Add authorization using authentication
F: Add authentication using User model
F: Add User model
```

## Interview Question Patterns

### Technical Decision Questions

**For authentication/security:**
- "How should the system handle token refresh when user has multiple tabs open?"
- "What's the UX when a user's session expires mid-form-fill?"
- "Should admin users bypass rate limiting, or should they be rate-limited differently?"
- "How should we handle password reset if user's email was compromised?"

**For refactoring:**
- "Are there other places using this same pattern that should also be refactored?"
- "Does this change affect any performance-critical code paths?"
- "Will this make it easier or harder to add [related feature] in the future?"
- "Should we deprecate the old method or remove it immediately?"

**For UI changes:**
- "How should this behave on mobile vs desktop?"
- "What happens if the data takes 5 seconds to load?"
- "Should keyboard navigation work differently here?"
- "How should this handle offline mode?"

### Edge Case Questions

**For data handling:**
- "What happens with empty arrays/null values/undefined?"
- "How should we handle concurrent updates to the same resource?"
- "What's the behavior for duplicate entries?"
- "Should we validate on client, server, or both?"

**For async operations:**
- "What if the user navigates away mid-operation?"
- "Should we retry failed requests? How many times?"
- "What's the timeout threshold?"
- "How do we handle partial failures?"

### UX/Design Questions

**For forms:**
- "Should changes auto-save or require explicit save?"
- "What's the validation feedback mechanism?"
- "Can users undo after submit?"
- "What happens if validation fails after submit?"

**For loading states:**
- "Should we show skeleton screens or spinners?"
- "At what point do we show 'taking longer than expected'?"
- "Can users cancel long-running operations?"

### Missing Change Questions

**For features:**
- "Should we add analytics tracking for this?"
- "Do we need feature flags to control rollout?"
- "What about logging for debugging?"
- "Error boundaries for graceful degradation?"

**For refactoring:**
- "Should we update related tests?"
- "Documentation updates needed?"
- "Migration guide for other teams?"

## Edge Cases

### Mixed Intentions in Same File

**Scenario:** File has both feature code and refactoring

**Solution:**
1. Try to separate using `git add -p` (interactive staging)
2. If inseparable, categorize by dominant intention
3. Ask user during interview: "This file has both refactoring and feature code. Should we separate them?"

### No Clear Intention

**Scenario:** Change doesn't fit F/B/R/D/T/E/A/C

**Solution:**
- Use `*` (unknown) intention
- Ask user during interview for clarification
- Example: `*: Mixed changes to auth module`

### Dependency Cycle

**Scenario:** Commit A needs B, but B needs A

**Solution:**
1. Identify if cycle is real or perceived
2. If real, combine into single commit
3. Use `!!` suffix (risky due to size)
4. Example: `F!! Add User model and authentication (circular dependency)`

### Large Provably Safe Change

**Scenario:** 500 files changed, all import updates

**Solution:**
- Still one commit (it's provably safe)
- Use lowercase `a`
- Example: `a Update imports after reorganizing src/ directory`
- **Why:** Safe changes don't become risky just because they're large

### Multiple Tickets in Changes

**Scenario:** Uncommitted work spans FOO-123 and FOO-124

**Solution:**
1. Group by ticket
2. Create separate commits per ticket
3. Ask user: "I see changes for FOO-123 and FOO-124. Should these be separate commits?"

### Forgotten Loading State

**Scenario:** Interview reveals missing loading state

**Solution:**
1. Add loading state code
2. Include in feature commit
3. Regroup commits if needed
4. Example:
   ```bash
   # Before interview
   F: Add data fetching

   # After interview (with loading state added)
   F: Add data fetching with loading state
   ```

### Untracked Files

**Scenario:** `git status` shows untracked files

**Solution:**
1. Ask user: "Should these files be committed?"
2. If yes, categorize and include
3. If no, suggest `.gitignore`

### Staged + Unstaged Changes

**Scenario:** Some changes already staged, some not

**Solution:**
1. Analyze both staged and unstaged
2. Regroup logically (may unstage some, stage others)
3. Final commits may differ from initial staging

### Git Command Failures

**Scenario:** `git add` or `git commit` fails

**Solution:**
1. Show error to user
2. Don't retry automatically
3. Ask: "Git command failed: `<error>`. How should I proceed?"
4. Options: Fix issue / Skip / Abort

**Special case - Commit hooks fail:**
- Show hook output
- **Never use `--no-verify` without explicit user permission**
- Ask user to fix issue or grant permission to skip

### Security: Sensitive Data Detected

**Scenario:** Diff contains potential API keys, passwords, or tokens

**Patterns to detect:**
```bash
# API keys (long alphanumeric)
[A-Z0-9]{32,}

# AWS keys
AKIA[A-Z0-9]{16}

# Private keys
-----BEGIN.*PRIVATE KEY-----

# Common variable names
(password|PASSWORD|secret|SECRET|token|TOKEN|api_key|API_KEY)\s*=\s*['""].*['""]
```

**Solution:**
1. **STOP** before grouping
2. Show: "Potential `<type>` in `<file>:<line>` (pattern: `<redacted>`)"
3. Ask: "This looks like sensitive data. What should I do?"
4. Options:
   - Exclude this file
   - It's safe (test data/example)
   - Abort and let me remove it

### Large Files

**Scenario:** File has >1000 lines changed (e.g., package-lock.json)

**Solution:**
1. Don't analyze diff line-by-line (too slow, too verbose)
2. Categorize by path pattern only
3. Show: "`<file>` changed (X lines)"
4. Ask: "Categorize as `<intention>` based on path pattern?"

**Examples:**
- `package-lock.json` (5000 lines) → E (environment)
- `dist/bundle.js` (10000 lines) → Should this be committed? (likely gitignore)

### Branch Already Exists

**Scenario:** Proposed branch name already exists locally or remotely

**Solution:**
1. Check if it's current branch: "Already on `<name>`. Continue?"
2. If different branch: "Branch `<name>` exists. Choose different name or switch?"
3. If remote only: "Remote branch `<name>` exists. Pull and continue, or rename?"

### No Changes Detected

**Scenario:** `git status` shows working tree clean

**Solution:**
1. Inform: "No uncommitted changes detected"
2. Ask: "Check for stashed changes?"
3. If stash exists: "Stash `<name>` found. Apply and organize?"

## Verification Scenarios

### Test 1: Simple Feature
```bash
echo "// feature" >> src/feature.ts
echo "// test" >> src/feature.spec.ts
```

**Expected:**
- 1 commit: `F: Add feature`
- Both files in same commit

### Test 2: Mixed Changes
```bash
echo "feature" >> src/feature.ts
echo "test" >> src/feature.spec.ts
echo "docs" >> README.md
echo '"lodash": "^4.17.21"' >> package.json
```

**Expected:**
- 3 commits in order:
  1. `E: Add lodash dependency`
  2. `F: Add feature`
  3. `D: Update README`

### Test 3: IDE Rename
```bash
# Rename "oldMethod" to "newMethod" across 50 files
for file in src/**/*.ts; do
  sed -i '' 's/oldMethod/newMethod/g' "$file"
done
```

**Expected:**
- 1 commit: `a Rename oldMethod to newMethod`
- All 50 files in one commit

### Test 4: Typo Fix
```bash
# Fix typo across multiple markdown files
for file in docs/*.md; do
  sed -i '' 's/recieve/receive/g' "$file"
done
```

**Expected:**
- 1 commit: `d Fix typo: recieve → receive`
- All docs in one commit

### Test 5: Interview Reveals Missing Change
```bash
# Initial changes
echo "auth code" >> src/auth.ts
echo "auth test" >> src/auth.spec.ts

# Interview asks: "What about loading state?"
# User says: "Oh, I should add that"

# Skill adds:
echo "loading state" >> src/auth.ts
```

**Expected:**
- 1 commit: `F: Add authentication with loading state`
- All files including new loading state

### Test 6: Interview Question Quality

**Setup:**
```bash
echo "auth code" >> src/auth.ts
echo "auth test" >> src/auth.spec.ts
```

**Expected Interview Questions (NOT):**
- ❌ "Did you test this?"
- ❌ "Does it work?"
- ❌ "Is this ready to commit?"
- ❌ "Are you sure this is correct?"

**Expected Interview Questions (YES):**
- ✅ "How should the system handle token refresh when user has multiple tabs open?"
- ✅ "What's the UX when a user's session expires mid-form-fill?"
- ✅ "Should admin users bypass rate limiting, or be rate-limited differently?"
- ✅ "How should we handle password reset if user's email was compromised?"

**Verification:**
- Questions are **contextual** (mention auth, tokens, sessions, not generic)
- Questions explore **edge cases and tradeoffs** (multi-tab, expiry, security)
- Questions might **reveal missing code** (rate limiting, token refresh logic, session management)
- Questions use **specific domain terms** from the changes (not "this", "that", "the feature")

### Test 7: Security Check

**Setup:**
```bash
echo 'const API_KEY = "AKIAIOSFODNN7EXAMPLE";' >> src/config.ts
```

**Expected:**
- ⚠️ **STOP before grouping**
- Show: "Potential AWS key in `src/config.ts:1` (pattern: `AKIA...`)"
- Ask: "This looks like sensitive data. What should I do?"
- Options: Exclude file / It's safe / Abort

**Verification:**
- Skill detects AWS key pattern
- Does NOT proceed to grouping automatically
- Gives user control over how to handle

### Test 8: Large File

**Setup:**
```bash
# Simulate large package-lock.json change
for i in {1..5000}; do
  echo "  \"package-$i\": \"^1.0.0\"," >> package-lock.json
done
```

**Expected:**
- Show: "`package-lock.json` changed (5000 lines)"
- Ask: "Categorize as E (environment) without detailed analysis?"
- Does NOT try to analyze 5000 lines line-by-line

**Verification:**
- Skill detects large file
- Skips detailed diff analysis
- Categorizes by path pattern

## Common Mistakes to Avoid

### Mistake 1: Reimplementing Risk Logic

**Wrong:**
```typescript
// Don't do this in branch-and-commit skill
if (filesChanged > 10) {
  annotation = "R!!";
} else if (testsPass) {
  annotation = "R";
}
```

**Right:**
```typescript
// Do this instead
const context = {
  intention: "R",
  filesChanged: 50,
  linesOfCode: 150,
  testStatus: "all pass",
  changeNature: "IDE rename",
  toolAssisted: true
};

// Invoke /commit-notation
const annotation = await invokeCommitNotation(context);
// Returns: "a" (provably safe)
```

### Mistake 2: Splitting Safe Changes

**Wrong:**
```bash
# 50 files from IDE rename split into 5 commits
a Rename oldMethod to newMethod (part 1)
a Rename oldMethod to newMethod (part 2)
...
```

**Right:**
```bash
# All 50 files in one commit
a Rename oldMethod to newMethod
```

### Mistake 3: Skipping Interview

**Wrong:**
```bash
# Just commit what's there
F: Add authentication
```

**Right:**
```bash
# Ask questions first:
# "How should we handle token refresh with multiple tabs?"
# User: "Oh, I didn't think about that. Let me add that."

# Then commit:
F: Add authentication with multi-tab token refresh
```

### Mistake 4: Obvious Interview Questions

**Wrong:**
- "Did you test this?"
- "Does it work?"
- "Are you sure?"

**Right:**
- "How should we handle token refresh when user has multiple tabs open?"
- "What happens if the user's session expires mid-form-fill?"
- "Should admin users be rate-limited differently?"

### Mistake 5: Forgetting Ticket Prefix

**Wrong:**
```bash
F: Add authentication

FOO-123
```

**Right:**
```bash
F: Add authentication

#FOO-123
```

## See Also

- [SKILL.md](SKILL.md) - Main skill documentation
- `/commit-notation` - Risk level logic and commit formatting
- `/commit` - Atomic commit principles
- `/handling-pull-requests` - PR creation workflow
