# commit-notation

Development notes for the commit notation skill.

## Reference Documentation

| Resource | URL |
|----------|-----|
| Quatico Commit Notation (canonical) | https://docs.example.invalid/internal/development-practices/commit-notation |
| Arlo's Commit Notation (original) | https://github.com/RefactoringCombos/ArlosCommitNotation |
| Quatico GitHub fork (archived) | https://github.com/quatico-solutions/QuaticoCommitNotation |

## Key Design Decisions

### Source of Truth
The canonical documentation is maintained at [docs.example.invalid](https://docs.example.invalid/internal/development-practices/commit-notation). SKILL.md and REFERENCE.md must stay in sync with that page.

### Extension Letters
Quatico extends Arlo's v1 notation with additional intention letters:
- **T** (Test-only): Alter tests without altering functionality
- **E** (Environment): Dev setup, tooling, non-code changes

Previously also included A (Automated), C (Comment), S (Spec) — these were absorbed into R and D respectively.

### Risk Levels
Four-tier system distinguishing verification confidence:
- Known Safe (lowercase): Provably correct
- Validated (UPPERCASE): Test-verified
- Risky (!!): Attempted but not fully verified
- Broken (**): WIP, may not compile

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial skill based on Quatico Commit Notation 1.1 |
