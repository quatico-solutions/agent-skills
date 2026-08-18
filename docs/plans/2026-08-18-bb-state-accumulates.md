# Repeated `--state` flags silently keep only the last

> `bb pr list --state open --state merged` returns merged PRs only, with no
> error — a plausible list that is quietly the wrong one.

## Status

- **Phase:** Draft
- **Type:** bug
- **Sprint:** <!-- optional, filled when plan is added to a sprint -->
- **Review:** pr
- **Impl:** same branch

## Approval

- **Approved:**
- **Approved by:**
- **Assignee:** jwloka

## Changelog

- Passing `--state` more than once no longer produces a filtered list that
  silently ignores all but the last flag.

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

**What is open — deliberately.** Three resolutions are defensible, and picking
one is a judgement about `bb`'s intended surface rather than something this
finding settles:

| Option | Behaviour | Cost |
|---|---|---|
| **Accumulate** | Collect states, query the API once per state, concatenate | Most useful; changes the meaning of a currently-accepted invocation, and needs an answer for result ordering |
| **Reject** | Second `--state` exits non-zero: "specify --state once" | Smallest change, no new semantics; a caller wanting several states writes the loop |
| **Reject, plus an `all` token** | As above, and `--state all` covers open+merged+declined | Serves the actual use case that produced this report; adds a token `bb` does not have today |

The measurement that argues for the third: the downstream need was never *two*
states, it was *all* of them. `gh pr list` spells that `--state all`, so a
consumer moving between hosts expects the token to exist.

**Whether `superseded` belongs in `all`** is a real sub-question, not a detail:
such a PR is replaced by a newer one for the same branch, so a consumer
rendering one row per branch would show that branch twice. `gh`'s `all` has no
equivalent state, so there is no cross-host precedent to follow.

**Ordering, if accumulation wins.** Concatenating per-state responses gives an
order that reflects the query, not the PRs. Bitbucket returns each state's page
newest-first; across states that property is lost unless the merged result is
re-sorted. A consumer filtering for "the first match for this branch" — which
is what Plot's adapter does — depends on it.

### Open Questions

- [ ] Which of the three resolutions? (Accumulate / reject / reject-plus-`all`)
- [ ] If `all` is added: does it include `superseded`?
- [ ] If accumulation is added: is the concatenated result re-sorted, and by
      what — `updated_on`, `created_on`, or id?
- [ ] Does the same defect exist on other repeatable-looking flags? `--author`
      uses the same assignment shape (`author="$2"`) and was not measured.

## Branches

- `bug/bb-state-accumulates` — the plan, and the fix once a resolution is chosen

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
