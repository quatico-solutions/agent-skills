# Repeated `--state` flags silently keep only the last

> `bb pr list --state open --state merged` returns merged PRs only, with no
> error — a plausible list that is quietly the wrong one.

## Status

- **Phase:** Delivered
- **Type:** bug
- **Delivered:** 2026-08-18
- **Sprint:** <!-- optional, filled when plan is added to a sprint -->
- **Review:** pr
- **Impl:** same branch
- **Approved:** 2026-08-18, Jan Wloka, plan-PR #60 reviewed

## Approval

- **Approved:**
- **Approved by:**
- **Assignee:** jwloka

## Changelog

- Passing `--state` more than once now covers every state given, rather than
  silently keeping only the last. `--author` accumulates the same way.

## Motivation

`cmd_pr_list` accepts every `--state` flag it is given, validates each one, and
then keeps only the last:

```bash
# skills/working-with-bitbucket-api/bin/bb
--state)
  state="$(bb_upper "$2")"; shift 2      # assignment, not accumulation
  case "$state" in
    OPEN|MERGED|DECLINED|SUPERSEDED) ;;
    *) echo >&2 "error: invalid --state '$state' …"; exit 1 ;;
  esac
  ;;
```

Each flag passes validation on its own, so nothing rejects the combination.
Measured against `bitbucket.org/quatico/ekzweb` on 2026-08-18 with `bb` 1.0.0:

| invocation | returned |
|---|---|
| `--state open` | 3 PRs, all OPEN |
| `--state open --state merged` | 50 PRs, all MERGED — **the 3 open ones are gone** |
| `--state merged --state open` | 3 PRs, all OPEN — **order decides the answer** |

Exit code 0 every time. No warning on stderr.

### Why this is worse than an error

A caller asking for two states and receiving one has no way to notice: the
result is a well-formed, non-empty list of real PRs. The two invocations above
differ only in argument order, and nothing in the output says which states it
actually covers.

The failure mode is *plausible but incomplete data*, which is exactly the
category this CLI avoids elsewhere. `bb pr list --help` already takes care to
say that state values stay Bitbucket's rather than gh's, so a consumer is not
misled about vocabulary — the same care is missing for how many states a query
covers.

### Found by a downstream consumer

Plot's host adapter (`plot-host.sh`) needs every PR regardless of state to
render its board. Its first attempt used repeated flags, on the reasonable
assumption that a CLI accepting a flag twice either accumulates or objects.
It returned only DECLINED PRs, and the bug was found only because the counts
were checked against a known total.

That adapter now issues **one call per state** and concatenates, which works
against `bb` as it is today and does not depend on this plan landing. So there
is no downstream blocker — the cost is a defect that will be re-discovered by
whoever tries the obvious thing next.

## Design

### Approach

**What is agreed:** the current behaviour is wrong. Accepting input and
silently discarding most of it is not a defensible answer for any of the three
readings below.

**The resolution: accumulate.** Repeated `--state` flags collect into a set and
the query covers all of them.

Three resolutions were defensible when this was written — accumulate, reject a
second flag, or reject plus an `all` token — and the two arguments against
accumulation were cost and ordering. Measured against `quatico/ekzweb` on
2026-08-18, both dissolve:

| query | returned |
|---|---|
| `?state=OPEN` | 5, all OPEN |
| `?state=OPEN&state=MERGED` | 1657, OPEN **and** MERGED, interleaved |

Bitbucket accepts repeated `state=` parameters natively and returns the union,
already sorted descending by `updated_on`. So accumulation is **one API call,
not one per state**, and there is no concatenated result to re-sort — the host
does it. Rejecting a second flag would mean `bb` refusing something the API
underneath supports natively and for free.

`--author` has the same defect (`author="$2"`, assignment not accumulation) and
is fixed the same way in the same change: one rule for repeated flags across the
command, rather than two flags with two behaviours.

### Where the fix has to be right

The state filter is built in **three** places, and a fix that only handles the
obvious one reintroduces this very bug on the other two:

| Site | Shape today | Multi-state form |
|---|---|---|
| plain (`bin/bb:663`) | `?state=${state}` | repeated `&state=` parameters |
| author, server-side (`:661`) | `q=state = "X" AND author.nickname = "..."` | `(state = "X" OR state = "Y") AND author...` |
| author, client-side fallback (`:671`) | `?state=${state}` again | repeated `&state=` parameters |

**`q=` silently overrides `state=` when both are present.** Measured:
`?q=state="OPEN"&state=MERGED` returns 5 PRs, OPEN only — the `state=` parameter
is discarded without comment. An implementation that appends `&state=` parameters
therefore works perfectly until `--author` is also passed, at which point every
appended state vanishes and the caller gets a plausible, filtered, wrong list.
That is the defect this plan exists to remove, reintroduced by its own fix, and
it passes any test written against the non-author path.

So **one helper owns the filter**: it takes the requested states and the optional
author, and returns the correct query for the path in use. All three sites call
it. The `q=`-versus-`state=` interaction is then decided once, in a place a
reader can find, rather than living implicitly in three constructions that are
free to drift.

The client-side fallback fetches **all requested states**, not the first one. A
recovery path that silently narrows the result is the same defect wearing a
different hat.

Accumulation is silent — no stderr note, no warning on a duplicate. It is the
documented behaviour of the flag once this lands, and there is nothing
exceptional left to report.

### `bb`'s validation is load-bearing

Bitbucket does not reject an unrecognised state; it silently ignores the filter.
Measured: `?state=ALL` and `?state=BOGUS_NONSENSE` both return **1678** PRs
across three states, where the unfiltered default returns 5. `ALL` is not a
Bitbucket token — it is simply not understood, and an unparsed value drops the
filter entirely.

`bb`'s existing `OPEN|MERGED|DECLINED|SUPERSEDED` check is therefore the only
thing standing between a typo and a 1678-row answer that looks like a result.
It stays strict, and it should be understood as a guard rather than politeness:
the API layer below has the same silent-wrong-answer behaviour this plan is
about.

This also settles the `all` token, though not in its favour. Since `ALL` means
nothing to Bitbucket, `bb` would have to expand it client-side into the states
it knows — which is accumulation with a shorthand spelling, not a separate
mechanism. Not proposed here; it can be added later on top of accumulation
without changing anything this plan decides.

### Testing

The defect is in **query construction**, so that is what the tests assert: the
URL `bb` builds for each of the three sites — repeated `state=` parameters on the
plain path, correct `OR` grouping on the author path, and the fallback covering
every requested state. A test that only asserts on a mocked response would pass a
wrong query whenever the fixture returns the right thing regardless of what was
asked, which is exactly the failure mode here.

### Open Questions

- [ ] [Domain] **Would `--state all` include `superseded`?** Unmeasurable here:
      `quatico/ekzweb` has zero SUPERSEDED PRs, so the four-state union and the
      three-state one both return 1678 — identical, and therefore evidence of
      nothing. The argument for excluding them is that a superseded PR is
      replaced by a newer one for the same branch, so a consumer rendering one
      row per branch would show that branch twice; `gh`'s `all` has no
      equivalent state, so there is no cross-host precedent either. Needs a
      repository that actually has some. Not blocking: `all` is not proposed
      in this plan. — *deferred: needs a repo with superseded PRs*
- [x] [Trade-offs] Which of the three resolutions? — *answered: accumulate.
      Bitbucket accepts repeated `state=` natively, so the cost and ordering
      objections were both measured away*
- [x] [Technical] Is the concatenated result re-sorted, and by what? —
      *answered: no concatenation happens. The host returns the union already
      sorted descending by `updated_on`*
- [x] [Technical] Does the same defect exist on `--author`? — *answered: yes,
      same assignment shape, fixed in the same change*
- [x] [Technical] Where does the fix have to be right? — *answered: three
      construction sites, and `q=` silently overrides `state=` — so one helper
      owns the filter rather than three inline fixes*

## Done when

Assertions on the **query `bb` builds**, since that is where the defect lives:

- **`--state open --state merged` covers both**, in either order. The original
  finding: order decided the answer, and neither answer was the right one.
- **`--author` with two states does not drop either.** The pairing that matters:
  a fix applied only to the plain path passes every other assertion here while
  silently discarding states on the `q=` path — this bug, reintroduced by its
  own fix.
- **The client-side fallback covers all requested states.** Assert the second
  request, not just the first; a recovery path that narrows the result fails the
  same way as the bug.
- **A repeated identical state is harmless** — `--state open --state open`
  behaves as `--state open`, no error, no duplicate rows.
- **An invalid state still exits non-zero.** Assert explicitly: the API silently
  returns 1678 rows for an unrecognised value, so this check is the only guard.
- **A single `--state` is byte-identical to today**, and the default with no
  flag stays OPEN.

Plus: `pnpm test` in `skills/working-with-bitbucket-api/tests/` green on Linux
and macOS/bash 3.2, `--help` documents that both flags may be repeated, and a
changeset is present.

## Branches

- `bug/bb-state-accumulates` — → #60 **merged 2026-08-18** (squashed) — the plan and the fix, on one branch

## Notes

- Reported from a Plot session on 2026-08-18. The consumer-side workaround
  (one call per state) is already in place, so nothing is blocked on this.
- Related but distinct: `idea/bb-reports-pr-mergeability` touches the same
  `bb pr list` surface, adding `checks` and `mergeable` fields. That plan is
  about what each PR object *carries*; this one is about which PRs the query
  *covers*. Kept separate rather than folded in, since that plan is already in
  review.
- `--limit` does not exist on `bb pr list` and is not proposed here. It is
  named only because the same downstream call passed it: `bb` correctly
  rejects it with `unknown flag`, which is the loud failure this report asks
  for in the `--state` case.
