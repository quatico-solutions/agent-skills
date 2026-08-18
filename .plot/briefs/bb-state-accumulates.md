# Implementation brief — bb-state-accumulates

- **Plan (canonical):** `docs/plans/2026-08-18-bb-state-accumulates.md` — on **this branch**, not on main
- **Approved:** 2026-08-18, Jan Wloka, plan-PR #60 reviewed
- **Branch:** `bug/bb-state-accumulates` (base: `main`) — already exists, plan committed on it
- **Ends as:** PR **#60**, which already exists and stays open. It carries plan *and* code and merges once, at the end. Do not open a second PR. Do not merge it yourself.
- **Review of the code:** normal PR review; CI runs `bb-tests` on Linux **and** macOS/bash 3.2

Single wave, single branch — `Impl: same branch`. There is nothing to fan out and
no worktree to enter; work here.

## What to build

`bb pr list` accepts `--state` (and `--author`) more than once, validates each,
then keeps only the last. Make repeated flags **accumulate** instead.

The failure this fixes, measured on `quatico/ekzweb`:

| invocation | returned |
|---|---|
| `--state open` | 3 PRs, all OPEN |
| `--state open --state merged` | 50 PRs, all MERGED — the 3 open ones silently gone |
| `--state merged --state open` | 3 PRs, all OPEN — **order decides the answer** |

Exit 0 every time, nothing on stderr. The result is a well-formed, non-empty list
of real PRs, so a caller has no way to notice it is the wrong one.

The plan is canonical. This is orientation.

## The decisions the plan settles — do not re-derive them

**Accumulate, not reject.** Three resolutions were open (accumulate / reject a
second flag / reject plus an `all` token) and the two arguments against
accumulating were cost and ordering. Both were measured away:

```
?state=OPEN                  →    5 PRs, all OPEN
?state=OPEN&state=MERGED     → 1657 PRs, OPEN and MERGED, interleaved
```

Bitbucket accepts repeated `state=` parameters natively and returns the union
**already sorted descending by `updated_on`**. So this is **one API call, not one
per state**, and there is nothing to concatenate or re-sort. Rejecting a second
flag would mean `bb` refusing what the API underneath does natively and for free.

**No `all` token.** `state=ALL` and `state=BOGUS_NONSENSE` return byte-identical
results — 1678 PRs where the unfiltered default returns 5. `ALL` means nothing to
Bitbucket; an unparsed value silently *disables* the filter. So `bb` would have to
expand `all` client-side, which is accumulation with a shorthand spelling. Out of
scope; it can be added later on top of this without changing anything here.

**`bb`'s state validation is load-bearing — keep it strict.** Because of the
above, the existing `OPEN|MERGED|DECLINED|SUPERSEDED` check is the only thing
between a typo and a 1678-row answer that looks like a result. It is a guard, not
politeness. Do not relax it to make accumulation easier.

**Silent on success.** No stderr note, no warning on a duplicate. Accumulation is
the documented behaviour of the flag once this lands; there is nothing
exceptional to report. `--state open --state open` simply behaves as
`--state open`.

**`--author` is in scope.** It has the identical defect (`author="$2"`,
assignment not accumulation) and gets the same treatment in this change — one
rule for repeated flags across the command, not two flags with two behaviours.

## The trap — read this before writing any code

**The state filter is built in three places, and `q=` silently overrides
`state=`.**

| Site | Shape today | Multi-state form |
|---|---|---|
| plain (`bin/bb:663`) | `?state=${state}` | repeated `&state=` params |
| author, server-side (`:661`) | `q=state = "X" AND author.nickname = "…"` | `(state = "X" OR state = "Y") AND author…` |
| author, client-side fallback (`:671`) | `?state=${state}` again | repeated `&state=` params |

Measured: `?q=state="OPEN"&state=MERGED` returns **5 PRs, OPEN only** — the
`state=` parameter is discarded without comment.

So an implementation that appends `&state=` parameters works perfectly **until
`--author` is also passed**, at which point every appended state vanishes and the
caller gets a plausible, filtered, wrong list. That is the defect this plan
exists to remove, reintroduced by its own fix — and it passes every test written
against the non-author path.

**Therefore: one helper owns the filter.** It takes the requested states plus the
optional author and returns the correct query for the path in use; all three
sites call it. The `q=`-versus-`state=` interaction gets decided once, somewhere a
reader can find it, instead of living implicitly in three constructions free to
drift apart.

**The client-side fallback (`:671`) must fetch all requested states**, not the
first. It is easy to miss — it re-derives the path from the same single `state`
variable. A recovery path that silently narrows the result fails exactly the way
the bug does.

## Carried-over rules

- **`q=` values are URL-encoded by hand** in the current code (`%3D`, `%22`).
  Whatever the helper emits must encode the same way — an unencoded `"` or `=`
  in a `q=` expression is a malformed query, and Bitbucket's response to a
  malformed filter is *not* an error (see the `ALL` finding above).
- **`bb api` paths need a leading slash.** Without one you get
  `HTTP 403 — Forbidden`, which reads as a permissions problem and is not.
  Relevant if you probe the API by hand while working.
- **bash 3.2 compatibility is a CI gate**, not a preference: no `declare -A`, no
  `${var^^}`, no `mapfile`; under `set -u` expand possibly-empty arrays as
  `${arr[@]+"${arr[@]}"}`. Accumulating into an array makes this immediately
  relevant — `bb-tests-macos` pins `/bin/bash` and will catch you.

## Done when

The plan's `## Done when` is the specification. The assertions are on **the query
`bb` builds**, not on mocked responses: a fixture that returns the right thing
regardless of what was asked passes a wrong query.

These exist because a naive implementation passes without them:

- **`--author` with two states drops neither** — catches the `q=` trap above,
  which is invisible to every non-author test.
- **The fallback covers all requested states** — assert the *second* request, not
  just the first.
- **An invalid state still exits non-zero** — the API would otherwise return 1678
  rows for a typo.
- **A single `--state` is byte-identical to today**, and the no-flag default stays
  OPEN.

Plus this repo's gates (`## Plot Config` → Definition of Done):

- `pnpm test` and `pnpm run validate` pass
- `pnpm test` in `skills/working-with-bitbucket-api/tests/` green on Linux **and**
  macOS/bash 3.2 — this touches `bin/bb`, so `bb-tests.yml` runs
- `--help` documents that both flags may be repeated
- A changeset with a `bumps:` block for `working-with-bitbucket-api`

## Bookkeeping

PR #60 already exists and is already annotated in the plan — nothing to append.
Push commits to this branch as they land; the PR updates itself.

## Scope guard

This branch owns:

- `skills/working-with-bitbucket-api/bin/bb` — `cmd_pr_list` argument parsing and
  the three query-construction sites
- `skills/working-with-bitbucket-api/tests/` (incl. `fixtures/`)
- `docs/plans/2026-08-18-bb-state-accumulates.md` — the plan rides this branch
- one changeset file

**Also in flight, and it touches the same file:** `feature/bb-reports-pr-checks`
(wave 1 of `bb-reports-pr-mergeability`) is adding a `checks` field to the same
`bb pr list` command. It restructures `bb_pr_json_projection()` (`bin/bb:425`) —
the JSON *projection*, not the query construction this branch changes. Different
functions in one file: expect a merge conflict in `bin/bb` if both land close
together, and rebase rather than reaching into the other branch's work.

That plan is about what each PR object *carries*; this one is about which PRs the
query *covers*. Keep them separate.

One question stays open and is **not** yours to answer: whether a future
`--state all` would include `superseded`. Unmeasurable on `quatico/ekzweb` (it has
none). `all` is not part of this change.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
