---
description: Consolidate verbose agent rules into efficient AGENTS.md hub-and-spoke pattern with verification loops
---

# /consolidate-agent-rules - Agent Configuration Consolidation

Transform verbose single-file CLAUDE.md into the streamlined AGENTS.md hub-and-spoke pattern that ensures critical rules are visible and followed.

## The Pattern You're Implementing

Based on successful real-world implementation in production codebases:

**Hub File (AGENTS.md ~50-80 lines):**

- Critical non-negotiable rules (6-10 max, numbered, bold)
- Essential commands reference
- Quick pre-commit checklist
- Navigation map to detailed rules
- Cross-tool compatibility notice

**Spoke Files (docs/rules/*.md 150-400 lines each):**

- Topic-based detailed rules (testing.md, typescript.md, git.md, security.md, etc.)
- Example-driven with ✅ correct / ❌ wrong patterns
- Cross-references to related rules
- Comprehensive but focused on single domain

**Tool-Specific Config:**

- `.cursor/rules.md` - Cursor IDE specific (with YAML frontmatter)
- `.claude/settings.local.json` - Permission allow-lists

**Why this works:**

- Progressive disclosure: Quick reference (2 min) → Deep dive (when needed)
- Critical rules impossible to miss
- Context-specific navigation reduces cognitive load
- Example-driven learning through visual patterns

## Phase 1: Project Analysis

### Step 1: Detect Current Configuration

Look for existing agent configuration files:

```bash
# Check for various patterns
ls -la CLAUDE.md AGENTS.md .claude/ .cursor/ docs/rules/ 2>/dev/null
```

**Patterns you might find:**

- Single `CLAUDE.md` (old pattern - needs consolidation)
- `AGENTS.md` + `docs/rules/` (already following pattern - needs polishing only)
- `.claude/skills/` directory (shared config repo pattern)
- `.cursor/rules.md` (Cursor-specific rules)
- Mixed patterns (partial migration)

### Step 2: Read All Existing Configuration

Read every file you found:

- CLAUDE.md or AGENTS.md (main instructions)
- All files in docs/rules/ (if exists)
- .cursor/rules.md (if exists)
- .claude/settings.local.json (if exists)
- Any skill files in .claude/skills/ (if exists)

**Create inventory:**

| File | Lines | Type | Contains |
|------|-------|------|----------|
| CLAUDE.md | 450 | monolith | Testing, git, TypeScript, security rules mixed |
| .cursor/rules.md | 300 | tool-specific | Cursor IDE rules |
| ... | ... | ... | ... |

### Step 3: Extract All Rules

Parse each file and extract:

- **Critical rules** (keywords: NEVER, MUST, ALWAYS, Critical, Non-Negotiable)
- **Domain rules** (testing, git, TypeScript, security, CI, architecture)
- **Commands** (bash snippets, npm scripts, build commands)
- **Examples** (code blocks with correct/wrong patterns)
- **Checklists** (pre-commit, pre-PR, pre-deploy)
- **Cross-references** (links between rules)

Create **rule inventory** in your working memory:

```
CRITICAL RULES (10 found):
1. [CLAUDE.md:45] NEVER use any - use unknown or generics
2. [CLAUDE.md:67] CI must pass before merge
3. [.cursor/rules.md:23] NEVER put expect() inside conditionals
...

TESTING RULES (15 found):
1. [CLAUDE.md:120-140] Jest AAA pattern
2. [CLAUDE.md:145-160] Mock naming conventions
...

GIT RULES (8 found):
...
```

## Phase 2: Consolidation Planning

### Step 4: Classify Rules by Destination

For each rule, determine its home:

**→ Hub (AGENTS.md):**

- Has "NEVER", "MUST", "ALWAYS" keywords
- Mentioned repeatedly across multiple contexts
- Would cause immediate breakage if violated
- User explicitly marked as "critical" or "non-negotiable"

**→ Spoke (docs/rules/*.md):**

- Domain-specific (only applies when working on testing, git, etc.)
- Has examples or detailed explanations
- Nice-to-know but not critical

**→ Tool-Specific (.cursor/rules.md or .claude/settings.local.json):**

- Only applies to one tool
- IDE-specific settings
- Permission allow-lists

### Step 5: Group Spoke Rules by Topic

Organize spoke rules into domains:

- **testing.md**: Jest, Playwright, test patterns, AAA, mocking, BDD
- **typescript.md**: Types, naming, React hooks, code style
- **git.md**: Commit messages, PR process, branching, Arlo's notation
- **security.md**: Validation, external data, authentication, secrets
- **ci-workflow.md**: Build process, pipeline, manifest validation
- **architecture.md**: System design, patterns, decisions
- **[project-specific].md**: Domain glossary, configuration system, etc.

**Quality check:**

- Each spoke should be 150-400 lines
- If <150: Consider merging with related spoke
- If >400: Consider splitting into sub-topics

## Phase 3: Generate Files

### Step 6: Create Hub (AGENTS.md)

Generate the hub file with this exact structure:

```markdown
# AGENTS.md

[1-2 sentence project description - extract from package.json or existing CLAUDE.md]
- Package manager: [pnpm/npm/maven/gradle]
- Framework: [key framework if applicable]

## Critical Rules (Non-Negotiable)

[Extract 6-10 CRITICAL rules from inventory]
[Number them, make them bold, use NEVER/MUST/ALWAYS keywords]

1. **CI Golden Rule**: No task is complete until all CI checks pass. Run `[build command]` before every push.
2. **NEVER use `[antipattern]`** - [Brief why + alternative]
3. **NEVER [antipattern]** - [Brief why]
4. **NEVER [antipattern]** - [Brief why]
5. **ALWAYS [pattern]** - [Brief why]
6. **[Rule description]** - [Brief why]

## Essential Commands

```bash
[Extract commands from original files]
[build command]      # Build
[test command]       # Test
[ci command]         # Full CI check - run before every push
[serve command]      # Dev server
```

## Quick Pre-Commit Checklist

Before every commit:

- [ ] Ran `[ci command]` locally and all checks passed
- [ ] [Project-specific check 1]
- [ ] [Project-specific check 2]
- [ ] [Project-specific check 3]

## Where to Find More

**When working on...**

- Testing (writing tests, fixing test failures) → `docs/rules/testing.md`
- Git & PRs (committing, creating PRs) → `docs/rules/git.md`
- [Domain] ([triggers]) → `docs/rules/[domain].md`
[Add line for each spoke file]

**Reference material:**

- [Architecture/glossary/config docs if exist]

---

*This file follows AGENTS.md convention for cross-tool compatibility (Claude Code, Cursor, Windsurf, etc.)*

```

**Target: 50-80 lines total**

### Step 7: Create Spokes (docs/rules/*.md)

For each domain, create a spoke file:

**Structure for each spoke:**

```markdown
# [Domain] Rules

## CRITICAL: [Most Important Rule for This Domain]

**The Rule:** [Explicit statement]

**Why?** [Explanation of consequences]

### Wrong ❌

```[language]
// NEVER DO THIS
[anti-pattern example]
```

**What's wrong?**

- [Problem 1]
- [Problem 2]

### Correct ✅

```[language]
// Use this pattern
[correct example]
```

## [Next Important Topic]

[Detailed explanation]

### [Sub-topic]

[Content with examples]

```[language]
// Example
[code]
```

## [Additional Topics]

...

[Cross-references at end if needed]
**Related:** See `[other-spoke].md` for [related topic]

```

**Quality standards for spokes:**
- Every rule has a "why" explanation
- Code examples use ✅ and ❌ markers
- Examples show both wrong and correct patterns
- Use code blocks with proper syntax highlighting
- Keep related concepts together
- Use headers for navigation

### Step 8: Create Tool-Specific Config (Optional)

If original files had Cursor-specific or Claude-specific content:

**.cursor/rules.md** (if Cursor IDE used):

```markdown
---
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: true
---

# Cursor IDE Rules

[Content from original .cursor/rules.md or equivalent]
[Can be more verbose than AGENTS.md]
[Include IDE-specific shortcuts, refactoring rules, etc.]
```

**.claude/settings.local.json** (if permissions needed):

```json
{
  "allowedCommands": {
    "bash": [
      "pnpm install",
      "pnpm build",
      "pnpm test",
      "pnpm dist",
      "git status",
      "git diff",
      "git log"
    ]
  },
  "allowedSkills": [
    "test-driven-development",
    "commit"
  ],
  "allowedDomains": [
    "internal-wiki.quatico.com",
    "bitbucket.org"
  ]
}
```

## Phase 4: VERIFICATION LOOP 1 - Completeness Check

**CRITICAL:** Before proceeding, verify no rules were lost during consolidation.

### Checklist

1. **Create rule mapping matrix**
   - List all rules from original files (by ID or line number)
   - Map each to new location (AGENTS.md line X, testing.md line Y, etc.)
   - Flag any unmapped rules

2. **Calculate coverage**
   - Total rules extracted: [N]
   - Rules in new structure: [M]
   - Coverage: M/N × 100%
   - **Required: 100% coverage**

3. **Generate completeness report**

```markdown
# Verification Loop 1: Completeness Check

## Summary
- Original rules: 73
- Mapped to new structure: 73
- Coverage: 100% ✅

## Mapping Matrix

| Original | Line | New Location | Verified |
|----------|------|--------------|----------|
| CLAUDE.md - NEVER use any | 45 | AGENTS.md:11 | ✅ |
| CLAUDE.md - CI must pass | 67 | AGENTS.md:9 | ✅ |
| CLAUDE.md - AAA pattern | 120-140 | testing.md:82-98 | ✅ |
| CLAUDE.md - Mock naming | 145-160 | testing.md:100-120 | ✅ |
...

## Issues Found
[None if 100% coverage, otherwise list missing rules]

## Status: PASS ✅ / FAIL ❌
```

**If FAIL:** DO NOT PROCEED. Add missing rules to appropriate files and re-run Loop 1.

## Phase 5: VERIFICATION LOOP 2 - Consistency Check

**CRITICAL:** Verify no contradictions and all cross-references valid.

### Checklist

1. **Detect contradictions**
   - Compare every rule pair for conflicts
   - Flag rules that contradict each other
   - Example: "Use mocks" vs "Never use mocks"

2. **Validate cross-references**
   - Extract all links: `docs/rules/testing.md`, `see git.md`, etc.
   - Verify each file exists
   - Verify referenced section exists
   - Check for circular references

3. **Verify critical rules prominence**
   - Check AGENTS.md has critical rules at top
   - Verify they use numbered list
   - Verify they use bold formatting
   - Verify they use NEVER/MUST/ALWAYS keywords

4. **Check example formatting**
   - All ✅ examples use "✅" marker
   - All ❌ examples use "❌" marker
   - Code blocks have language specified
   - Examples follow Wrong/Correct order

5. **Generate consistency report**

```markdown
# Verification Loop 2: Consistency Check

## Contradictions Found: [N]

[None if 0, otherwise:]
| Rule 1 | Rule 2 | Conflict |
|--------|--------|----------|
| testing.md:45 "Use mocks" | testing.md:120 "Avoid mocks for X" | Not actually contradictory - applies to different contexts ✅ |

## Cross-Reference Validation: [M total]

| Reference | Source | Target | Status |
|-----------|--------|--------|--------|
| See testing.md | AGENTS.md:42 | docs/rules/testing.md | ✅ Exists |
| See git.md for commits | testing.md:180 | docs/rules/git.md | ✅ Exists |
| Related: typescript.md | testing.md:95 | docs/rules/typescript.md | ✅ Exists |
...

## Critical Rules Check

- ✅ Located at top of AGENTS.md (lines 7-14)
- ✅ Numbered list (1-6)
- ✅ Bold formatting on all
- ✅ Use NEVER/MUST keywords

## Example Formatting: [P examples checked]

- ✅ All examples use ✅/❌ markers
- ✅ Code blocks have language specified
- ✅ Follow Wrong → Correct order

## Status: PASS ✅ / FAIL ❌
```

**If FAIL:** Fix contradictions, broken links, or formatting issues and re-run Loop 2.

## Phase 6: VERIFICATION LOOP 3 - Format Validation Check

**CRITICAL:** Verify file structure and syntax correctness.

### Checklist

1. **YAML frontmatter validation** (if .cursor/rules.md exists)
   - Valid YAML syntax
   - Required fields present (globs, alwaysApply)
   - Glob patterns valid

2. **JSON validation** (if .claude/settings.local.json exists)
   - Valid JSON syntax
   - Schema compliance (allowedCommands, allowedSkills, allowedDomains)
   - No duplicate keys

3. **Markdown structure validation**
   - Headers follow hierarchy (# → ## → ###, no skips)
   - Code blocks have closing backticks
   - Lists use consistent markers (-, *, numbers)
   - No broken markdown tables

4. **Critical rule formatting**
   - Each critical rule numbered (1. 2. 3. etc.)
   - Each starts with **bold text**
   - Each contains NEVER, MUST, ALWAYS, or "Rule" keyword
   - Each has brief explanation after dash

5. **File size checks**
   - AGENTS.md: 50-80 lines ✅ / Warning if outside range
   - Each spoke: 150-400 lines ✅ / Warning if outside range
   - Total reduction: Calculate % saved vs original

6. **Generate validation report**

```markdown
# Verification Loop 3: Format Validation Check

## YAML Validation (.cursor/rules.md)
- ✅ Valid syntax
- ✅ Required fields present
- ✅ Glob patterns valid

## JSON Validation (.claude/settings.local.json)
- ✅ Valid syntax
- ✅ Schema compliant
- ✅ No duplicates

## Markdown Structure
- ✅ Header hierarchy correct (all files)
- ✅ Code blocks closed (all files)
- ✅ Lists formatted consistently
- ✅ Tables valid

## Critical Rule Formatting (AGENTS.md:7-14)
1. ✅ Numbered
2. ✅ Bold
3. ✅ Contains NEVER keyword
4. ✅ Has explanation
[Repeat for each]

## File Size Analysis

| File | Lines | Target | Status |
|------|-------|--------|--------|
| AGENTS.md | 58 | 50-80 | ✅ |
| docs/rules/testing.md | 215 | 150-400 | ✅ |
| docs/rules/typescript.md | 320 | 150-400 | ✅ |
| docs/rules/git.md | 180 | 150-400 | ✅ |

**Total Reduction:**
- Original: 450 lines (CLAUDE.md)
- New: 773 lines (distributed)
- Reduction: -72% (acceptable - better organized trumps brevity)

OR

- Original: 1200 lines (CLAUDE.md + .cursor/rules.md + skills)
- New: 773 lines (distributed)
- Reduction: +36% ✅

## Status: PASS ✅ / FAIL ❌
```

**If FAIL:** Fix format errors and re-run Loop 3.

## Phase 7: Generate Migration Report

After all 3 verification loops pass, create comprehensive report:

### Create Directory Structure

```bash
mkdir -p consolidation-$(date +%Y-%m-%d-%H%M%S)/{verification,original-backup,docs/rules,.cursor,.claude}
```

### Generate Files

1. **migration-report.md** - Executive summary

```markdown
# Agent Rules Consolidation Report

**Date:** $(date)
**Project:** [project name]

## Summary

✅ Successfully consolidated agent rules into AGENTS.md hub-and-spoke pattern.

**Original configuration:**
- CLAUDE.md: 450 lines (monolithic)
- [Other files if exist]
- Total: 450 lines in 1 file

**New configuration:**
- AGENTS.md: 58 lines (hub)
- docs/rules/testing.md: 215 lines
- docs/rules/typescript.md: 320 lines
- docs/rules/git.md: 180 lines
- Total: 773 lines in 4 files (+72% total, but better organized)

**Improvements:**
- Critical rules prominently displayed (top 6 rules, numbered, bold)
- Progressive disclosure (quick reference → detailed rules)
- Context-specific navigation (when working on X → see Y)
- Example-driven learning (✅/❌ patterns)
- Cross-tool compatibility maintained

## Verification Results

| Loop | Check | Status |
|------|-------|--------|
| 1 | Completeness (100% coverage) | ✅ PASS |
| 2 | Consistency (0 contradictions, all refs valid) | ✅ PASS |
| 3 | Format Validation (valid syntax, size targets) | ✅ PASS |

## Next Steps

1. Review generated files in `consolidation-[timestamp]/`
2. Compare with originals using `diff-summary.md`
3. Test in both Claude Code and Cursor (if applicable)
4. If approved:
   ```bash
   # Backup originals
   cp CLAUDE.md original-backup/

   # Apply new structure
   cp consolidation-[timestamp]/AGENTS.md .
   cp -r consolidation-[timestamp]/docs/rules docs/

   # Commit
   git add AGENTS.md docs/rules/
   git commit -m "R: Consolidate agent rules into AGENTS.md pattern"
   ```

## Files Generated

- AGENTS.md (hub)
- docs/rules/*.md (spokes)
- verification/1-completeness.md
- verification/2-consistency.md
- verification/3-validation.md
- diff-summary.md
- migration-report.md (this file)

```

2. **diff-summary.md** - Side-by-side comparison

Show key changes:
- Critical rules moved to top of AGENTS.md
- Testing rules → docs/rules/testing.md
- Git rules → docs/rules/git.md
- etc.

3. **Verification reports** - Copy Loop 1, 2, 3 outputs to verification/ directory

4. **Backup originals** - Copy all original files to original-backup/

## Phase 8: Present Results and Get Approval

Show the user:

1. **Migration report** (read migration-report.md to user)
2. **Key improvements** (highlight critical rules prominence, organization)
3. **Verification status** (all 3 loops passed)
4. **Next steps** (how to apply changes)

**Ask user:**
"I've successfully consolidated your agent rules into the AGENTS.md pattern. All 3 verification loops passed:
- ✅ Completeness: 100% rule coverage
- ✅ Consistency: 0 contradictions, all cross-refs valid
- ✅ Format: Valid syntax, size targets met

Review the files in `consolidation-[timestamp]/`. Would you like me to:
1. Apply changes to your project (backup originals first)
2. Make adjustments to generated files
3. Show specific sections for review"

## Quality Assurance

Before finalizing, double-check:

- [ ] AGENTS.md is 50-80 lines
- [ ] Critical rules at top, numbered, bold
- [ ] All spokes are 150-400 lines
- [ ] Every spoke has examples with ✅/❌ markers
- [ ] Navigation map in AGENTS.md covers all spokes
- [ ] Pre-commit checklist actionable
- [ ] Cross-references resolve
- [ ] No contradictions
- [ ] 100% rule coverage from original
- [ ] All 3 verification loops passed
- [ ] Original files backed up
- [ ] Cross-tool compatibility statement included

## Error Handling

If any verification loop fails:

1. **Loop 1 failure (missing rules):**
   - Identify unmapped rules from report
   - Add to appropriate file (hub or spoke)
   - Re-run Loop 1

2. **Loop 2 failure (contradictions/broken refs):**
   - Resolve contradictions by clarifying context
   - Fix broken cross-references
   - Re-run Loop 2

3. **Loop 3 failure (format issues):**
   - Fix YAML/JSON syntax errors
   - Correct markdown structure
   - Adjust file sizes if needed
   - Re-run Loop 3

**NEVER proceed to next phase until current verification loop passes.**

## Success Metrics

Your consolidation succeeds when:

1. **All verification loops pass** (100% coverage, 0 conflicts, valid format)
2. **Critical rules prominent** (top of AGENTS.md, numbered, bold, NEVER/MUST keywords)
3. **File sizes in range** (AGENTS.md: 50-80, spokes: 150-400)
4. **Examples visual** (✅/❌ markers throughout)
5. **Navigation clear** (task → file mapping obvious)
6. **User approves** (reviews and confirms changes)

## Cross-Tool Compatibility

Ensure final output works with:
- ✅ Claude Code (AGENTS.md as primary instructions)
- ✅ Cursor (can also use .cursor/rules.md if generated)
- ✅ Windsurf (AGENTS.md compatible)
- ✅ Any tool following AGENTS.md convention

Include compatibility statement at bottom of AGENTS.md:

```markdown
---

*This file follows AGENTS.md convention for cross-tool compatibility (Claude Code, Cursor, Windsurf, etc.)*
```

---

**Remember:** This command creates a PROPOSAL. You generate files in a timestamped directory, run verification loops, and present results. The user decides whether to apply changes to their project.
