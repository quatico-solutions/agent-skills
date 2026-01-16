# Jest Testing Conventions Skill

Development notes for the jest-testing-conventions skill.

## Design Decisions

### Source Material
Based on "a colleague's pocket guide to Unit Testing with Jest" (`jest-guide.md`), converted to skill format with:
- Condensed explanations
- Added naming conventions from internal-project
- Removed lengthy motivational sections
- Added practical anti-patterns

### Scope
- Focused on Jest-specific patterns
- Complements TDD workflow skills
- Inner loop of double-loop-bdd-tdd

### Naming Conventions
Variables follow internal-project conventions:
- `testObj` - The object being tested
- `target` / `target*` - Function or mock being observed
- `mock*` - Mock implementations
- `actual` - Result from code under test
- `expected` - Expected value for assertion

## Source Materials

- `/Users/ma/Downloads/jest-guide.md` - a colleague's Jest guide
- `/Users/ma/CODE/CDS/internal-project/.cursor/rules.md` - internal-project naming conventions
- Jest documentation: https://jestjs.io/docs/mock-functions

## Testing Notes

Verify skill provides useful guidance:
```
claude "Help me mock a module dependency in Jest"
```

Should produce:
- Correct jest.mock() usage
- Typed mock with jest.mocked()
- Cleanup in config or beforeEach
- AAA pattern structure

## Key Sections

### Three Core Functions
Most confusion in Jest comes from not understanding when to use:
- `jest.fn()` - New mock function
- `jest.spyOn()` - Observe/mock existing function
- `jest.mock()` - Replace module imports

### Clear/Reset/Restore
Frequently confused. The matrix in SKILL.md clarifies:
- Clear = history only
- Reset = history + implementation
- Restore = original (spies only)

### Anti-Patterns
Common mistakes from code reviews:
- Testing mock behavior (not code)
- Conditional expects (may skip)
- Over-mocking (proves nothing)

## Open Questions

### Vitest Compatibility
Vitest uses Jest-compatible API. Should we:
- Keep Jest-focused (current)?
- Add Vitest notes?
- Create separate vitest-conventions skill?

Current decision: Jest-focused, note Vitest compatibility.

### ESM Mocking
ES Modules require different mocking approach. Should cover:
- `jest.unstable_mockModule()`
- Module factory patterns

Current decision: Out of scope, may add later.

## Version History

- **1.0** - Initial version based on jest-guide.md with internal-project conventions
