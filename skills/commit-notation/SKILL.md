---
name: commit-notation
description: Formats git commits using Quatico's notation (Arlo's v1 with extensions). Use when writing commit messages, reviewing commits, discussing commit conventions, or when another skill references commit formatting.
---

# Commit Notation

> **Source of truth:** [quatico-solutions/QuaticoCommitNotation](https://github.com/quatico-solutions/QuaticoCommitNotation)

Quatico uses Arlo's Commit Notation v1 with extensions (T, E, A, C, S).

## Quick Reference

| Risk Level | Format | Example |
|------------|--------|---------|
| Known Safe | `x` | `r Extract method getData` |
| Validated | `X` | `R: Extract method getData` |
| Risky | `X!!` | `R!! Rename across files` |
| Broken | `X**` | `F** WIP: new feature` |

## Intentions

### Core

| Letter | Name | Use When |
|--------|------|----------|
| F | Feature | Adding or changing behavior |
| B | Bugfix | Fixing broken behavior |
| R | Refactoring | Changing implementation, not behavior |
| D | Documentation | Non-code documentation changes |

### Extensions

| Letter | Name | Use When |
|--------|------|----------|
| T | Test-only | Alter tests without altering functionality |
| E | Environment | Dev setup, tooling, non-code changes |
| A | Automated | Tool-assisted: IDE refactoring, formatters, linters (deterministic tools only, no AI/LLMs) |
| C | Comment | Comment-only changes (not JSDoc/JavaDoc) |
| S | Spec | Formal specification, design docs |
| * | Unknown | Mixed changes, just checking in |

## Risk Level Guidelines

**Known Safe (lowercase)**: Provable correctness - tool-verified refactoring, type-checked renames.
**Validated (UPPERCASE)**: Test-verified - ran tests, all pass.
**Risky (XX!!)**: Attempted but not fully verified.
**Broken (XX**)**: WIP, may not compile, no verification.

## Commit Message Format

```
X: Summary in active voice

TICKET-123
```

**Rules:**
- **Separator**: `:` or nothing (e.g., `F: Add feature` or `F Add feature`)
- **Voice**: Active ("Add feature") not progressive ("Adding feature")
- **Length**: Subject < 75 chars
- **Ticket**: Last line, blank line before, NO `#` prefix (git treats `#` as comment)

## Writing Commit Messages

1. **Determine intention**: F, B, R, D, T, E, A, C, S, or *
2. **Assess risk level**: How verified is this change?
3. **Find ticket number**: See below
4. **Format**: `[prefix] Summary` with ticket on last line

**Keep changes small**: Features/bugfixes should be ≤8 LoC for Validated level.

## Ticket Numbers

### Finding the Ticket

1. **Check branch name**: Look for pattern like `XXX-123`
   - `FOO-123-my-bugfix` → `FOO-123`
   - `bugfix/FOO-123-description` → `FOO-123`
   - `feature/BAR-456-new-feature` → `BAR-456`

2. **Check recent commits**: If not in branch name, check commits not yet merged to main:
   ```bash
   git log origin/main..HEAD --oneline
   ```

3. **Ask user**: If still not found, ask:
   - Is this an infrastructure change (leave empty)?
   - What's the ticket number?

### When to Omit Ticket

Infrastructure changes may omit tickets:
- CI/CD pipeline fixes
- Development environment setup
- Release version bumps
- Dependency updates
- Code formatting/linting

## Examples

```
F: Add user authentication endpoint

FOO-123
```

```
B!! Fix race condition in event handler

BAR-456
```

```
r Extract method calculateTotal

FOO-123
```

```
a Rename userId to userIdentifier

FOO-123
```

```
A!! Run prettier on src/**/*.ts
```

```
D: Update CI pipeline documentation
```

See [REFERENCE.md](REFERENCE.md) for full notation details and risk level criteria.
