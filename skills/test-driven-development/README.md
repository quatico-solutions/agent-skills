# Test-Driven Development Skill

Development notes for the test-driven-development skill.

## Design Decisions

### Why a Standalone Skill?

Other skills reference external TDD resources (superpowers plugin), but we can't rely on everyone having those installed. This standalone skill:
- Is self-contained (no external dependencies)
- Follows proven LLM optimization patterns from superpowers
- Adapts to our development method
- Integrates as the inner loop within the outer BDD loop (outside-in development)

### Structure Pattern (from Superpowers)

Proven LLM-friendly patterns we kept:
- YAML frontmatter with trigger keywords
- Iron Law framing (non-negotiable rules)
- Good/Bad code example blocks
- Red Flags section (stop conditions)
- Common Rationalizations table (excuse vs reality)
- Verification Checklist
- "When Stuck" troubleshooting table

### Key Adaptations

**From the TDD flow presentation:**
- TDD flow digraph with "revert if passes first run" decision point
- Emphasis on watching tests fail correctly

**From the internal Jest guide:**
- Naming conventions (testObj, target, mock*, actual, expected)
- AAA pattern (Arrange-Act-Assert)
- "Mocks are necessary evil" principle
- One assertion focus
- FIRST test qualities (Fast, Isolated, Repeatable, Self-validating, Timely)

**What We Delegated:**
- Jest-specific mocking patterns -> **jest-testing-conventions**
- BDD outer loop details -> the outer BDD loop (outside-in development)

### Digraph Visualization

Render the TDD flow digraph (requires `brew install graphviz`):
```bash
../../../.dev/scripts/render-digraphs.sh SKILL.md ./diagrams
```

## Source Materials

| Source | URL | Content Used |
|--------|-----|--------------|
| Superpowers TDD skill | (structure reference) | LLM optimization patterns, anti-patterns file |
| jest-testing-conventions | (this repo) | Jest-specific patterns (delegates there) |

## Testing Notes

Verify skill loads correctly:
```bash
claude "Use test-driven-development skill"
```

Test in both environments:
- Claude Code (Opus 4.5)
- Cursor (to be verified)

## Related Skills

| Skill | Relationship |
|-------|--------------|
| jest-testing-conventions | Jest-specific patterns (jest.fn/spyOn/mock, fake timers) |
| outer BDD loop (outside-in development) | This skill is the inner TDD loop |
| commit-notation | Referenced for commits after completing work |

## Version History

- **1.0** - Initial standalone version adapted from superpowers pattern
