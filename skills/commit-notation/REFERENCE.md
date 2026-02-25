# Quatico Commit Notation Reference

> **Source of truth:** [docs.example.invalid — Commit Notation](https://docs.example.invalid/internal/development-practices/commit-notation)
> This file mirrors that page, optimized for Claude's context window.
> **SYNC REQUIRED:** Changes here MUST stay consistent with the docs site. Changes incomplete without sync.

Based on Arlo's Commit Notation v1 with Quatico extensions.

## Contents

- [The Four Risk Levels](#the-four-risk-levels)
- [Intentions](#intentions)
  - [Feature (F)](#feature-f) | [Bugfix (B)](#bugfix-b) | [Refactoring (R)](#refactoring-r) | [Documentation (D)](#documentation-d)
  - [Test-only (T)](#test-only-t) | [Environment (E)](#environment-e) | [Unknown (WIP)](#unknown-wip)
- [Provable Refactorings](#provable-refactorings)
- [Test-supported Procedural Refactorings](#test-supported-procedural-refactorings)
- [Small Features and Bug Fixes](#small-features-and-bug-fixes)

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

## Intentions

| Prefix | Name | Intention |
|--------|------|-----------|
| F | Feature | Change or extend one aspect of program behavior |
| B | Bugfix | Repair one existing, undesirable program behavior |
| R | Refactoring | Change implementation without changing program behavior. Includes tool-assisted changes (IDE renames, formatters, linters). |
| D | Documentation | Change something which communicates and does not impact behavior. Includes comment-only changes and formal specifications. |
| T | Test-only | Alter tests without altering functionality |
| E | Environment | Non-code development setup changes |
| WIP | Unknown | Multiple changes, just getting it checked in |

### Feature (F)

**Known Risks**
- May alter unrelated feature (spooky action at a distance)
- May alter a piece of this feature that should remain unchanged
- May implement the change differently than intended

| Code | Known Approaches |
|------|------------------|
| `f` | Examples: Local/focused change validated in DEV (no env-specific behavior); Extensive E2E tests; Text-only changes (i18n) apparent from diff |
| `F` | Change ≤8 LoC, fully unit tested, includes new/changed tests |
| `F!!` | Partially tested |
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
| `B!!` | Partially tested |
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

### Test-only (T)

| Code | Known Approaches |
|------|------------------|
| `t` | Refactoring purely within test code |
| `T` | New test for existing behavior, all tests pass |
| `T!!` | New test without running full suite |
| `T**` | Incomplete test, WIP |

**Alternatives**: Use `F` or `B` depending on what the test validates. Use `R` for refactoring within test code.

### Environment (E)

| Code | Known Approaches |
|------|------------------|
| `e` | Config change with no compilation impact |
| `E` | Tooling change, verified working |
| `E!!` | CI/CD change, not fully tested |
| `E**` | Experimenting with build config |

### Unknown (WIP)

Multiple unrelated changes, just getting it checked in.

**Alternative**: Require each commit to have exactly one intention.

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

## Retired Intentions

These appear in older commits but are no longer used:

| Code | Was | Now use |
|------|-----|---------|
| A | Automated (tool-assisted changes) | R |
| C | Comment (comment-only changes) | D |
| S | Spec (formal specifications) | D |
