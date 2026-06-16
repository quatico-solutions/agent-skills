# commit

Development notes for the commit best practices skill.

## Purpose

Improve discoverability of commit-related guidance by providing a clear entry point that covers **when** and **what** to commit, complementing `commit-notation` which covers **how** to format the message.

## Design Decisions

### Separation from commit-notation
- This skill: timing, composition, hooks
- commit-notation: message format (Arlo's notation)

### "Done and verified" emphasis
The most common mistake is treating commits as save points. This skill emphasizes that commits are checkpoints of verified, complete work.

### Git hooks section
Agents sometimes skip hooks to "get things done." This section establishes that skipping requires explicit human approval—no exceptions.

## Related Skills

- `commit-notation` — message formatting
- `handling-pull-requests` — PR workflow after commits
