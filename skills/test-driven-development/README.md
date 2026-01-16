# Test-Driven Development Skill

Development notes for the test-driven-development skill.

## Design Decisions

### Why a Standalone Skill?

Other skills reference external TDD resources (superpowers plugin), but we can't rely on everyone having those installed. This standalone skill:
- Is self-contained (no external dependencies)
- Follows proven LLM optimization patterns from superpowers
- Adapts to our development method (a colleague's presentation)
- Integrates with our double-loop-bdd-tdd skill as the inner loop

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

**From a colleague's Presentation (slides 50-51):**
- TDD flow digraph with "revert if passes first run" decision point
- Emphasis on watching tests fail correctly

**From a colleague's Jest Guide:**
- Naming conventions (testObj, target, mock*, actual, expected)
- AAA pattern (Arrange-Act-Assert)
- "Mocks are necessary evil" principle
- One assertion focus
- FIRST test qualities (Fast, Isolated, Repeatable, Self-validating, Timely)

**What We Delegated:**
- Jest-specific mocking patterns -> **jest-testing-conventions**
- BDD outer loop details -> **double-loop-bdd-tdd**

### Digraph Visualization

Render the TDD flow digraph (requires `brew install graphviz`):
```bash
../../../.dev/scripts/render-digraphs.sh SKILL.md ./diagrams
```

## Source Materials

| Source | URL | Content Used |
|--------|-----|--------------|
| Superpowers TDD skill | (structure reference) | LLM optimization patterns, anti-patterns file |
| a colleague's Jest Guide | [Bitbucket](https://example.invalid/jest-guide/src/develop/jest-guide.md) | Naming conventions, AAA pattern, core testing rules |
| Double Loop workshop | [Bitbucket](https://example.invalid/double-loop-tdd-with-bdd/) | TDD flow digraph, integration with BDD |
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
| double-loop-bdd-tdd | Outer BDD loop—this skill is the inner TDD loop |
| commit-notation | Referenced for commits after completing work |

## Version History

- **1.0** - Initial standalone version adapted from superpowers pattern
