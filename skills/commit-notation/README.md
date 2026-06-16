# commit-notation

Development notes for the commit notation skill.

## Reference Documentation

| Resource | URL |
|----------|-----|
| QuaticoCommitNotation (canonical) | https://github.com/quatico-solutions/QuaticoCommitNotation |
| Arlo's Commit Notation (original) | https://github.com/RefactoringCombos/ArlosCommitNotation |

## Key Design Decisions

### Source of Truth
The canonical documentation is maintained at [QuaticoCommitNotation (GitHub)](https://github.com/quatico-solutions/QuaticoCommitNotation). SKILL.md and REFERENCE.md must stay in sync with that repo.

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
