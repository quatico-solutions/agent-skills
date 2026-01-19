# commit-notation

Development notes for the commit notation skill.

## Reference Documentation

| Resource | URL |
|----------|-----|
| Quatico Commit Notation | https://github.com/quatico-solutions/QuaticoCommitNotation |
| Arlo's Commit Notation | https://github.com/RefactoringCombos/ArlosCommitNotation |

## Key Design Decisions

### Source of Truth
The canonical documentation is maintained in [quatico-solutions/QuaticoCommitNotation](https://github.com/quatico-solutions/QuaticoCommitNotation). SKILL.md must stay in sync with that source.

### Extension Letters
Quatico extends Arlo's v1 notation with additional intention letters:
- **T** (Test-only): Alter tests without altering functionality
- **E** (Environment): Dev setup, tooling, non-code changes
- **A** (Automated): Tool-assisted changes (deterministic tools only, no AI/LLMs)
- **C** (Comment): Comment-only changes
- **S** (Spec): Formal specification, design docs

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
