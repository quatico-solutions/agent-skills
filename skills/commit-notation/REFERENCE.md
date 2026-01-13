# Quatico Commit Notation Reference

Based on [Arlo's Commit Notation v1](https://github.com/quatico-solutions/QuaticoCommitNotation) with Quatico extensions.

## The Four Risk Levels

| Risk Level | Code | Example | Meaning |
|------------|------|---------|---------|
| **Known safe** | lowercase letter | `r Extract method` | Addresses all known and unknown risks |
| **Validated** | uppercase letter | `R: Extract method` | Addresses all known risks |
| **Risky** | uppercase + `!!` | `R!! Extract method` | Some known risks remain unverified |
| **(Probably) Broken** | uppercase + `**` | `R** Start extracting` | No risk attestation |

### Risk Level Definitions

- **Known safe**: Developer performed the task in a way that prevents potential risks, even for situations not known to the developer. Requires provable correctness (tool-verified, type-checked).
- **Validated**: Developer validated for all risks they thought of. Typically via automated tests.
- **Risky**: Developer aware of risks, attempted mitigation, but no formal verification.
- **Broken**: Known to be broken, or unable to verify. May not compile. Used for WIP or savepoints.

## Core Intentions

| Prefix | Name | Intention |
|--------|------|-----------|
| F | Feature | Change or extend one aspect of program behavior |
| B | Bugfix | Repair one existing, undesirable program behavior |
| R | Refactoring | Change implementation without changing program behavior |
| D | Documentation | Change something which communicates and does not impact behavior |

### Feature (F)

**Known Risks**
- May alter unrelated feature (spooky action at a distance)
- May alter a piece of this feature that should remain unchanged
- May implement the change differently than intended

| Code | Known Approaches |
|------|------------------|
| `f` | Examples: Local/focused change validated in DEV (no env-specific behavior); Extensive E2E tests; Text-only changes (i18n) apparent from diff |
| `F` | Change ≤8 LoC, fully unit tested, includes new/changed tests |
| `F!!` | Includes unit tests for new behavior |
| `F**` | No automatic tests, or unfinished implementation |

### Bugfix (B)

**Known Risks**
- Customers may depend on the bug
- May alter unrelated feature
- May implement the fix differently than intended

| Code | Known Approaches |
|------|------------------|
| `b` | Examples: Local/focused change validated in DEV; E2E tests; Text-only changes; Extend/fix existing test |
| `B` | Reviewed with customer rep, ≤8 LoC, original behavior captured in test, includes changed test |
| `B!!` | Includes unit tests for new behavior |
| `B**` | No automatic tests, or unfinished implementation |

### Refactoring (R)

**Known Risks**
- May cause a bug
- May fix a bug accidentally
- May force a test update

| Code | Known Approaches |
|------|------------------|
| `r` | Provable refactoring OR test-supported procedural refactoring within test code |
| `R` | Test-supported procedural refactoring |
| `R!!` | Named refactoring, but edited code without full test coverage |
| `R**` | Remodeled by editing code |

### Documentation (D)

**Known Risks**
- May mislead future developers
- May alter team processes unexpectedly

| Code | Known Approaches |
|------|------------------|
| `d` | Dev-visible docs, not in source file, or verified byte-identical compilation |
| `D` | Dev-impacting only, changes compilation or process |
| `D!!` | Alters an important process |
| `D**` | Trying out a process change for info gathering |

## Extension Intentions

| Prefix | Name | Intention |
|--------|------|-----------|
| T | Test-only | Alter tests without altering functionality |
| E | Environment | Non-code development setup changes |
| A | Automated | Tool-assisted changes (IDE, formatters, linters). Deterministic tools only, no AI/LLMs. |
| C | Comment | Changes comments only (not JSDoc/JavaDoc) |
| S | Spec | Changes spec or design documents |
| * | Unknown | Multiple changes, just getting it checked in |

### Automated (A)

Tool-assisted changes where the method (automated tooling) is more significant than the underlying intention.

**When to use A vs R:**
- Use `A` when the tool execution is the primary activity
- Use `R` when performing a specific, named refactoring that happens to use a tool
- Use `A` when changes span multiple intentions or the tool made decisions

**Known Risks**
- Tool may have bugs
- Search & replace may match unintended patterns
- Bulk operations may be hard to review

| Code | Known Approaches |
|------|------------------|
| `a` | Provable tool refactoring: IDE rename/extract with type verification |
| `A` | Tool-assisted with test verification |
| `A!!` | Tool-assisted without full test coverage, or bulk operations manually reviewed |
| `A**` | Unverified bulk search/replace |

**Examples**
- `a Rename getUserData to fetchUserProfile` (IDE rename with TypeScript)
- `A: Extract interface IUserService` (IDE extract, tests pass)
- `A!! Format all files with prettier` (bulk format, reviewed)
- `A** Apply regex replace across 20 files` (not fully verified)

## Provable Refactorings

Methods to prove bug-for-bug compatibility:
- Automated refactoring via tool (knowing tool bugs)
- Scripted manual refactoring using compiler verification

These work on code without tests and are language-specific.

## Test-supported Procedural Refactorings

Lower standard of proof requiring:
1. Commit contains only a single refactoring
2. Refactoring is named and published (e.g., Fowler's catalog)
3. Either highly tested product OR working on uncalled new code
4. Followed published steps including test runs

## Small Features and Bug Fixes

Features and bugfixes ≤8 LoC are lower risk because:
1. Only possible when code is well-organized
2. Easy to see possible side effects
3. Easy to code review

**Approach**: Refactor until the change is easy, then add feature one piece at a time with tests.
