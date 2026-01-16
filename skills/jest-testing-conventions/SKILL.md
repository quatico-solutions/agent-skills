---
name: jest-testing-conventions
description: >-
  Use when writing unit tests with Jest. Covers naming conventions (testObj, target,
  mock, actual, expected), jest.fn/spyOn/mock mastery, clear/reset/restore differences,
  module mocking, fake timers, and AAA pattern. Triggers: Jest, unit test, mock,
  spy, stub, jest.fn, jest.spyOn, jest.mock.
compatibility: claude-code, cursor
metadata:
  version: "1.0"
  source: "Based on a colleague's Jest Guide"
---

# Jest Testing Conventions

## Overview

Master three functions: `jest.fn()`, `jest.spyOn()`, `jest.mock()`.

**Core principle:** Mocks are necessary evil. Prefer real code. Use mocks only when unavoidable.

## Naming Conventions

### Variable Naming

| Name | Purpose | Example |
|------|---------|---------|
| `testObj` | Object under test | `const testObj = new OrderService()` |
| `target` | Function under test | `const target = jest.fn()` |
| `target*` | Specific mock target | `targetAdd`, `targetFetch` |
| `mock*` | Mock implementation | `mockUserService`, `mockResponse` |
| `actual` | Result from code | `const actual = testObj.calculate()` |
| `expected` | Expected value | `const expected = 42` |

### Test Structure

```typescript
describe("OrderService", () => {
    describe("calculateTotal", () => {
        it("returns sum of item prices", () => {
            // Arrange
            const testObj = new OrderService();
            const mockItems = [{ price: 10 }, { price: 20 }];
            const expected = 30;

            // Act
            const actual = testObj.calculateTotal(mockItems);

            // Assert
            expect(actual).toBe(expected);
        });
    });
});
```

## The Three Core Functions

### jest.fn() - Stub a Function

Creates a mock function that can be observed and configured.

```typescript
// Basic stub
const target = jest.fn();
target("foo");
expect(target).toHaveBeenCalledWith("foo");

// With return value
const target = jest.fn().mockReturnValue("bar");
expect(target()).toBe("bar");

// With implementation
const target = jest.fn((x) => x * 2);
expect(target(5)).toBe(10);

// With promise resolution
const target = jest.fn().mockResolvedValue({ data: "result" });
await expect(target()).resolves.toEqual({ data: "result" });

// One-time implementation
const target = jest.fn()
    .mockReturnValueOnce("first")
    .mockReturnValueOnce("second")
    .mockReturnValue("default");
```

### jest.spyOn() - Spy on Existing Function

Observes calls while optionally mocking implementation.

```typescript
import * as math from "./math";

// Spy without changing implementation
const target = jest.spyOn(math, "add");
expect(math.add(1, 2)).toBe(3);  // Original runs
expect(target).toHaveBeenCalledWith(1, 2);

// Spy with mock implementation
jest.spyOn(math, "add").mockReturnValue(999);
expect(math.add(1, 2)).toBe(999);  // Mock runs

// Spy on object method
const obj = { getValue: () => 42 };
jest.spyOn(obj, "getValue").mockReturnValue(100);
expect(obj.getValue()).toBe(100);

// Spy on getter
jest.spyOn(obj, "value", "get").mockReturnValue(100);
```

### jest.mock() - Mock a Module

Replaces entire module exports with mocks.

```typescript
import { fetchUser } from "./userService";
import * as api from "./api";

jest.mock("./api");

test("fetchUser calls api.get", async () => {
    (api.get as jest.Mock).mockResolvedValue({ name: "John" });

    const result = await fetchUser(123);

    expect(api.get).toHaveBeenCalledWith("/users/123");
    expect(result.name).toBe("John");
});
```

## When to Use Each

| Scenario | Function | Rationale |
|----------|----------|-----------|
| Callback parameter | `jest.fn()` | Need to observe calls |
| Dependency injection | `jest.fn()` | Replace collaborator |
| Observe existing method | `jest.spyOn()` | Keep or mock implementation |
| External module | `jest.mock()` | Replace at import |
| Node built-in | `jest.mock()` | e.g., `fs`, `path` |

## Clear vs Reset vs Restore

Three different cleanup operations with distinct behaviors.

### Clear Mocks

Clears call history. Implementation stays.

```typescript
const target = jest.fn().mockReturnValue(42);
target();
target();

jest.clearAllMocks();  // or target.mockClear()

expect(target).not.toHaveBeenCalled();  // History cleared
expect(target()).toBe(42);  // Implementation stays
```

### Reset Mocks

Clears history AND removes implementation.

```typescript
const target = jest.fn().mockReturnValue(42);
target();

jest.resetAllMocks();  // or target.mockReset()

expect(target).not.toHaveBeenCalled();  // History cleared
expect(target()).toBeUndefined();  // Implementation gone
```

### Restore Mocks

Restores original implementation (only for spies).

```typescript
const obj = { getValue: () => 42 };
jest.spyOn(obj, "getValue").mockReturnValue(100);

expect(obj.getValue()).toBe(100);  // Mock

jest.restoreAllMocks();  // or spy.mockRestore()

expect(obj.getValue()).toBe(42);  // Original restored
```

### Cleanup Summary

| Method | Clears History | Removes Implementation | Restores Original |
|--------|---------------|----------------------|-------------------|
| `mockClear()` | Yes | No | No |
| `mockReset()` | Yes | Yes | No |
| `mockRestore()` | Yes | Yes | Yes (spies only) |

### Recommended Config

```typescript
// jest.config.ts
export default {
    clearMocks: true,    // Clear history between tests
    resetMocks: true,    // Also reset implementations
    restoreMocks: true,  // Also restore spies
};
```

## Module Mocking Patterns

### Full Mock

All exports become `jest.fn()`:

```typescript
jest.mock("./math");

import { add, subtract } from "./math";

test("mocked module", () => {
    (add as jest.Mock).mockReturnValue(10);
    expect(add(1, 2)).toBe(10);
});
```

### Partial Mock

Keep some original implementations:

```typescript
jest.mock("./utils", () => {
    const original = jest.requireActual("./utils");
    return {
        ...original,
        formatDate: jest.fn().mockReturnValue("2024-01-01"),
    };
});
```

### Manual Mock

Create `__mocks__/moduleName.ts`:

```
src/
├── services/
│   ├── userService.ts
│   └── __mocks__/
│       └── userService.ts
```

```typescript
// __mocks__/userService.ts
export const getUser = jest.fn().mockResolvedValue({ name: "Mock User" });
```

## Mocking Classes

### Mock Constructor

```typescript
jest.mock("./SoundPlayer", () => {
    return jest.fn().mockImplementation(() => ({
        play: jest.fn(),
        stop: jest.fn(),
    }));
});
```

### Mock Static Method

```typescript
jest.spyOn(SoundPlayer, "getSupportedFormats")
    .mockReturnValue(["mp3", "wav"]);
```

### Mock Instance Method

```typescript
const mockPlay = jest.fn();
SoundPlayer.mockImplementation(() => ({
    play: mockPlay,
}));

// Later
expect(mockPlay).toHaveBeenCalled();
```

## Fake Timers

Control time-based code without waiting.

### Basic Usage

```typescript
beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

test("debounce waits 300ms", () => {
    const callback = jest.fn();
    debounce(callback, 300)();

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalled();
});
```

### Timer Functions

| Function | Purpose |
|----------|---------|
| `jest.useFakeTimers()` | Enable fake timers |
| `jest.useRealTimers()` | Restore real timers |
| `jest.advanceTimersByTime(ms)` | Move time forward |
| `jest.runAllTimers()` | Execute all pending timers |
| `jest.runOnlyPendingTimers()` | Execute current pending only |
| `jest.clearAllTimers()` | Remove pending timers |

### With Promises

```typescript
test("async with timers", async () => {
    const promise = asyncDelay(1000);

    jest.advanceTimersByTime(1000);

    await promise;  // Now resolves
});
```

## Best Practices

### AAA Pattern

Every test follows Arrange-Act-Assert:

```typescript
test("calculates discount for premium users", () => {
    // Arrange
    const testObj = new PricingService();
    const mockUser = { isPremium: true };
    const basePrice = 100;

    // Act
    const actual = testObj.calculatePrice(basePrice, mockUser);

    // Assert
    expect(actual).toBe(90);  // 10% discount
});
```

### One Assertion Focus

Each test verifies one behavior:

```typescript
// Bad - multiple behaviors
test("order processing", () => {
    expect(order.validate()).toBe(true);
    expect(order.calculateTotal()).toBe(100);
    expect(order.save()).resolves.toBeDefined();
});

// Good - separate tests
test("validates order", () => { ... });
test("calculates total", () => { ... });
test("saves order", () => { ... });
```

### Mock Console

Suppress expected console output:

```typescript
beforeAll(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
    jest.restoreAllMocks();
});
```

### Typed Mocks

Use `jest.mocked()` for type safety:

```typescript
import { getUser } from "./userService";

jest.mock("./userService");

const mockGetUser = jest.mocked(getUser);

test("typed mock", async () => {
    mockGetUser.mockResolvedValue({ id: 1, name: "John" });
    // TypeScript knows the return type
});
```

## Common Matchers

```typescript
// Called
expect(mock).toHaveBeenCalled();
expect(mock).toHaveBeenCalledTimes(3);
expect(mock).toHaveBeenCalledWith(arg1, arg2);
expect(mock).toHaveBeenLastCalledWith(arg1);
expect(mock).toHaveBeenNthCalledWith(2, arg1);

// Return values
expect(mock).toHaveReturned();
expect(mock).toHaveReturnedWith(value);
expect(mock).toHaveLastReturnedWith(value);

// Flexible matchers
expect(mock).toHaveBeenCalledWith(
    expect.any(Number),
    expect.objectContaining({ id: 1 }),
    expect.arrayContaining([1, 2]),
    expect.stringMatching(/pattern/),
);
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Testing mock behavior | Verifies mock, not code | Test real behavior |
| Conditional expects | Tests may silently skip | Remove conditions |
| Shared mutable state | Tests affect each other | Reset in beforeEach |
| Over-mocking | Tests prove nothing | Mock only boundaries |
| Magic timeout numbers | Fragile, slow | Use fake timers |

## Verification Checklist

Before committing tests:

- [ ] AAA pattern (Arrange-Act-Assert)
- [ ] One behavior per test
- [ ] Clear variable names (testObj, target, actual, expected)
- [ ] Mocks cleaned up (config or manual)
- [ ] No conditional assertions
- [ ] Fake timers for time-based code
- [ ] Console mocked if expected output

## Related Skills

- **double-loop-bdd-tdd** - When to write unit tests (inner loop)
- **test-driven-development** - TDD workflow (superpowers)
