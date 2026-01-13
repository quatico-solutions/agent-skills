---
name: commit-notation
description: Formats git commits using Quatico's notation (Arlo's v1 with extensions). Use when writing commit messages, reviewing commits, discussing commit conventions, or when another skill references commit formatting.
---

# Commit Notation

Quatico uses Arlo's Commit Notation v1 with the "A" (Automated) extension.

## Quick Reference

| Risk Level | Format | Example |
|------------|--------|---------|
| Known Safe | `x - ` | `r - Extract method getData` |
| Validated | `X - ` | `R - Extract method getData` |
| Risky | `X!!` | `R!! Rename across files` |
| Broken | `X**` | `F** WIP: new feature` |

## Core Intentions

| Letter | Name | Use When |
|--------|------|----------|
| F/f | Feature | Adding or changing behavior |
| B/b | Bugfix | Fixing broken behavior |
| R/r | Refactoring | Changing implementation, not behavior |
| D/d | Documentation | Non-code documentation changes |
| A/a | Automated | Tool-assisted changes (IDE, formatters, AI) |

## Risk Level Guidelines

**Known Safe (lowercase)**: Provable correctness - tool-verified refactoring, type-checked renames.
**Validated (UPPERCASE)**: Test-verified - ran tests, all pass.
**Risky (XX!!)**: Attempted but not fully verified.
**Broken (XX**)**: WIP, may not compile, no verification.

## Writing Commit Messages

1. **Determine intention**: F, B, R, D, or A
2. **Assess risk level**: How verified is this change?
3. **Find ticket number**: See below
4. **Format**: `[risk][intention] TICKET-123 Summary`

**Keep changes small**: Features/bugfixes should be ≤8 LoC for Validated level.

## Ticket Numbers

Include the ticket number after the risk/intention prefix.

### Finding the Ticket Number

1. **Check branch name**: Look for pattern like `XXX-123`
   - `FOO-123-my-bugfix` → `FOO-123`
   - `bugfix/FOO-123-description` → `FOO-123`
   - `feature/BAR-456-new-feature` → `BAR-456`

2. **Check recent commits**: If not in branch name, check commits not yet merged to `origin/develop`:
   ```bash
   git log origin/develop..HEAD --oneline
   ```

3. **Ask user**: If still not found, ask:
   - Is this an infrastructure change (leave empty)?
   - What's the ticket number?

### When to Omit Ticket Numbers

Small infrastructure changes may omit the ticket:
- CI/CD pipeline fixes
- Development environment setup
- Release version bumps
- Dependency updates
- Code formatting/linting

## When to Use Each Intention

| Change Type | Intention | Risk Level Hints |
|-------------|-----------|------------------|
| New endpoint | F | `F - ` if tested, `F!!` if risky |
| Fix null pointer | B | `B - ` with test, `B!!` without |
| Extract method (IDE) | a | `a - ` with type checking |
| Rename (IDE) | a | `a - ` with type checking |
| Format files | A | `A!!` for bulk, review after |
| Update README | d | `d - ` if no compilation impact |
| AI-assisted refactor | A | `A!!` or `A**` depending on review |

## Examples

```
F - FOO-123 Add user authentication endpoint
B!! BAR-456 Fix race condition in event handler
r - FOO-123 Extract method calculateTotal
a - FOO-123 Rename userId to userIdentifier
A!! Run prettier on src/**/*.ts          (infra, no ticket)
D - Update CI pipeline documentation     (infra, no ticket)
```

See [REFERENCE.md](REFERENCE.md) for full notation details and risk level criteria.
