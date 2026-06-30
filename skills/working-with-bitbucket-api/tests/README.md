# bb CLI Integration Tests

End-to-end tests for the `bb` Bitbucket CLI that verify each command sends the correct API requests and produces the correct output.

## What This Tests

Each test spawns `bb` as a real subprocess, pointed at a local mock server. Two categories of tests:

1. **API tests** assert on the **final HTTP request** sent to Bitbucket — method, path, query parameters, and request body.
2. **Output tests** assert on the exact `stdout` text using inline snapshots — table formatting, empty states, confirmation messages.

Tests do **not** cover:

- **Real macOS Keychain writes** — `auth login` is tested with a `security` shim (`fixtures/bin/security`) so the success path never touches the developer's real Keychain
- **Interactive prompts** — `auth login` without a tty (the email/token/browser prompts) is out of reach of the subprocess harness; only the non-interactive (`--email` + piped token) path is exercised
- **Git remote auto-detection** — bypassed with the `-R` flag
- Intermediate resolution steps are asserted only where they affect the final request (e.g. default-base resolution, reviewer lookup failure)

## Architecture

```
node:test runner
  └─ spawns bb as subprocess
       └─ bb makes curl requests to mock server
            └─ mock server records requests + returns fixture data
  └─ test asserts on recorded requests
```

### The `BB_API_URL` Mechanism

The `bb` script lets the API base be overridden, but **only to a loopback host**:

```bash
if [[ -n "${BB_API_URL:-}" ]]; then
  if [[ "$BB_API_URL" =~ ^https?://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?(/|$) ]]; then
    BB_API="$BB_API_URL"
  else
    echo >&2 "error: BB_API_URL must point to a loopback host …"; exit 1
  fi
else
  BB_API="https://api.bitbucket.org/2.0"
fi
```

In production, `BB_API_URL` is unset so `BB_API` defaults to the real Bitbucket API. In tests, we set `BB_API_URL=http://localhost:<port>/mockbb` to redirect all API calls to our local Express mock server.

The loopback restriction is a security guard: every call carries the auth token as HTTP Basic, so an unrestricted override could exfiltrate the token to a remote host. The Bitbucket **Cloud** CLI only ever talks to `api.bitbucket.org`, so there is no legitimate non-local override to lose.

### Environment Bypass

Tests also bypass other external dependencies:

| Dependency | Production | Test |
|---|---|---|
| API base URL | `https://api.bitbucket.org/2.0` | `BB_API_URL=http://localhost:<port>/mockbb` |
| Auth token | macOS Keychain | `BB_TOKEN=fake-test-token` |
| Email | macOS Keychain | `BB_EMAIL=test@example.com` |
| Repository | `git remote get-url origin` | `-R testws/testrepo` flag |
| Keychain write (`auth login`) | `security add-generic-password` | `fixtures/bin/security` shim on `PATH` |

This means tests need only `curl`, `jq`, and standard POSIX tools — no git repo, no Keychain, no network.

### Subprocess stdin

The `bb()` helper accepts an `input` option, written to the subprocess's stdin. Commands that read from stdin — notably `auth login` in non-interactive mode, which reads the token — use it:

```typescript
await bb(['auth', 'login', '--email', 'a@b.com'], { port: server.port, input: 'my-token\n' })
```

stdin is always closed (EOF) so commands that `read` from it never hang.

## How to Run

```bash
# From this directory (tests/)
pnpm install   # first time only
pnpm test

# Single test file
node --import tsx --test pr-list.test.ts

# From repo root
pnpm test:bb
```

## Conventions

### File naming

One test file per command: `<group>-<verb>.test.ts` (e.g., `pr-list.test.ts`, `source-cat.test.ts`).

### Test structure

- `describe` blocks group by command, with a separate `describe('output', ...)` for output tests
- `it` blocks have short imperative names describing the behavior
- `// Given`, `// When`, `// Then` comments mark the BDD steps inside each test

API test example:

```typescript
it('Filters by --state merged', async () => {
  // Given bitbucket has merged pull requests
  server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListMerged)

  // When I run bb pr list --state merged
  const result = await bb('pr list --state merged', { port: server.port })

  // Then it sends state=MERGED
  assert.equal(server.getLastCall().query.state, 'MERGED')
})
```

Output test example (inline snapshot with template literal):

```typescript
it('Shows tabular PR list', async () => {
  // Given bitbucket has open pull requests
  server.stub('GET', '/repositories/testws/testrepo/pullrequests', prListOpen)

  // When I run bb pr list
  const result = await bb('pr list', { port: server.port })

  // Then the output is a formatted table
  assert.equal(result.stdout, `\
ID   STATE   AUTHOR   BRANCH   TITLE
42  OPEN  Alice Smith  feature/login    Add login feature
43  OPEN  Bob Jones    fix/readme-typo  Fix typo in README
`)
})
```

### Multi-word arguments

The `bb()` helper accepts `string | string[]`. Use array form when args contain multi-word values (whitespace-splitting breaks them):

```typescript
// String form — fine for simple args
await bb('pr list --state merged', { port: server.port })

// Array form — needed for multi-word values
await bb(['pr', 'create', '--title', 'Add login feature', '--head', 'feature/login'], { port: server.port })
```

### Fixtures

JSON files in `fixtures/` contain canned Bitbucket API responses. They have just enough fields for `bb` to parse without jq errors. Paginated responses include the `{ values: [...] }` wrapper.

## How to Add a Test

1. **Stub** the API endpoint your command will hit:
   ```typescript
   server.stub('GET', '/repositories/testws/testrepo/pullrequests', fixture)
   ```

2. **Run** the bb command:
   ```typescript
   const result = await bb('pr list', { port: server.port })
   ```

3. **Assert** on the recorded request:
   ```typescript
   const call = server.getLastCall()
   assert.equal(call.method, 'GET')
   assert.equal(call.query.state, 'OPEN')
   ```

For commands that make multiple API calls (e.g., `pr edit` does GET then PUT), use `server.getCalls()` or `server.getCallsTo(method, pathSubstring)` to inspect specific calls.

## Mock Server API

| Method | Description |
|---|---|
| `server.stub(method, pathPrefix, body, status?)` | Register JSON response (default 200). LIFO: last stub wins. |
| `server.stubRaw(method, pathPrefix, body, status?)` | Register non-JSON response (raw text). |
| `server.stubWithQuery(method, pathPrefix, query, body, status?)` | Register JSON response that only matches when specific query params are present. Takes priority over generic stubs for the same path. |
| `server.getCalls()` | All recorded requests, in order. |
| `server.getLastCall()` | Most recent request. Throws if none. |
| `server.getCallsTo(method, pathSubstr)` | Filter by method and path substring. |
| `server.reset()` | Clear all stubs and recorded calls. |
| `server.stop()` | Shut down the server. |

Each `RecordedCall` has: `{ method, url, path, query, headers, body }`.

### Stub matching

Stubs match by method and path prefix (e.g., stubbing `/pullrequests` matches `/pullrequests?state=OPEN`). When multiple stubs match, **LIFO** (last registered wins). This means:

- Register **generic** stubs first, **specific** stubs second
- When a broad prefix like `/repositories/testws/testrepo` would also match `/repositories/testws/testrepo/refs/branches`, register the broad one first so the specific one takes priority

For commands that hit the same path with different query params (e.g., `source cat` fetches `?format=meta` then the raw file), use `stubWithQuery` for the query-specific request.

## Tech Stack

- **Test runner:** `node:test` (Node.js built-in, zero dependencies)
- **Assertions:** `node:assert/strict`
- **Mock server:** Express 5
- **TypeScript:** via `tsx` loader (`node --import tsx`)
- **Subprocess:** `node:child_process` (`execFile` — safe from shell injection)
