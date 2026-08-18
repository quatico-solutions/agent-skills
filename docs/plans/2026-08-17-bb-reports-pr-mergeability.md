# `bb pr list` reports whether a PR merges and whether its builds passed

> Add `mergeable` and `checks` to `bb pr list --json`, so a consumer can
> tell a conflicting branch from a green one instead of being told
> `unknown` for both, forever.

## Status

- **Phase:** Approved
- **Type:** feature
- **Sprint:** <!-- optional, filled when plan is added to a sprint -->
- **Approved:** 2026-08-18, Jan Wloka, plan-PR #59 merged
- **Started:** 2026-08-18, Jan Wloka, `feature/bb-reports-pr-checks`

## Approval

- **Approved:**
- **Approved by:**
- **Assignee:** jwloka

## Changelog

- `bb pr list --json` gains `checks`, collapsing the head commit's build
  statuses to one answer in **Bitbucket's own vocabulary** — a consumer
  wanting gh's words maps them itself.
- `UNKNOWN` stays a real value and is never reported as a pass: *could
  not read the builds* and *no build ever ran* remain different answers.
- `bb pr view` reports the same facts for a single PR, spelled the same.
- Whether Bitbucket exposes mergeability at all is **an open question the
  second wave measures and reports** rather than one this plan assumes.

## Motivation

A downstream consumer — the Plot board — renders one row per branch with
the PR's condition beside it: *green*, *conflicts*, *no checks*, *CI
running*. On GitHub those come from `gh`. On Bitbucket every row reads
the same, because `bb` cannot answer either question.

### Measured, in the consumer

`plot-host.sh` is Plot's single adapter over both hosts. Its GitHub
branch derives two facts per PR:

```
mergeable: CONFLICTING | MERGEABLE | (else) unknown
checks:    from statusCheckRollup — green | pending | failing | none
```

Its Bitbucket branch cannot, and says so in a literal:

```
checks:"unknown", mergeable:"unknown", failing_checks:[]
```

with the comment *"a consumer must render those as plain text"*. The
adapter is not unfinished — it is at the limit of what `bb` reports.

### Measured, in `bb`

`bb pr list --json <fields>` supports ten gh-style keys:

```
number, title, state, headRefName, baseRefName,
isDraft, author, url, createdAt, updatedAt
```

No build status, no mergeability. `bb pr view` is the same. The words
`statuses` and `build` appear once in 2,300 lines, and not as a command.

### What that costs, concretely

On 2026-08-17 the consuming board showed PR #57 as **green** while the
host reported `CONFLICTING` — a branch that had been unmergeable for
**22 days** wearing the one word a reader acts on without checking. That
defect was in the consumer's own fold and is being fixed there.

But the same measurement showed why it matters here: on Bitbucket
`mergeable` is `unknown` on **every** row, permanently, and the consumer
has no way to do better. The GitHub defect is a bug; the Bitbucket
behaviour is a missing capability, and it is this repo's to add.

**`green` is the value that costs most when wrong.** *pending* invites
waiting, *failing* invites looking, *unknown* invites asking — *green*
says *this is fine, move on*.

## Design

### Two fields, from two Bitbucket endpoints

**`checks`** — from the head commit's build statuses
(`/2.0/repositories/{ws}/{repo}/commit/{sha}/statuses`). Bitbucket
reports per-status `state` values, and `bb` reports them as it finds
them — see *The words are Bitbucket's* below. What it adds is the
collapse of a **list** of statuses to one answer, which the caller cannot
do without the list:

| All statuses on the head commit | `checks` |
|---|---|
| none reported | `NONE` |
| any `FAILED` or `STOPPED` present | that value |
| else any `INPROGRESS` | `INPROGRESS` |
| all `SUCCESSFUL` | `SUCCESSFUL` |
| endpoint unreadable | `UNKNOWN` |

The precedence (a failure outranks an in-progress) is `bb`'s only
judgement here, and it is the one every host makes: one red check means
the set is not green.

**`mergeable`** — **and here the plan does not know its own source.**

This was written as though the PR object carries merge-conflict state.
It was not verified: `bb pr view` reads `.state` from that object and
nothing else, and no endpoint in `bin/bb` reports mergeability. Whether
Bitbucket exposes the fact at all — on the PR object, on a diff call, or
not at all — is **an open question this plan states rather than
answers**.

So wave 2 begins by measuring it against a real Bitbucket repository and
**reporting what it finds**, including the finding that no answer exists.
If none does, the honest outcome is that `mergeable` stays `unknown`
there permanently and the wave ships nothing — which is a result, not a
failure. Inventing a derivation (comparing branch heads, guessing from a
diff's emptiness) would produce a value that looks like the others and
means something else.

Wave 1 is unaffected: commit statuses are documented and the shape of
that answer is known.

### The words are Bitbucket's, not GitHub's

The first draft mapped both fields onto gh's vocabulary so the consumer
would receive identical words from both hosts. Interrogation reversed it,
and the existing help text is the reason: `state` already keeps
Bitbucket's spelling (`OPEN`/`MERGED`/`DECLINED`/`SUPERSEDED`) and
documents that as deliberate.

So `checks` reports what Bitbucket reports:

```
SUCCESSFUL | FAILED | INPROGRESS | STOPPED | (none) | (unreadable)
```

**`bb` is a thin, honest window on one host — not a gh emulator.** A
consumer that wants gh's words builds that mapping in its adapter, which
is exactly where such a mapping belongs and where the consuming project
already has one. Translating here would mean `bb` deciding that
`STOPPED` is `failing`, which is a judgement about *what a stopped build
means* — the consumer's call, made with knowledge of its own repository
conventions that `bb` does not have.

The cost is real and small: the consumer writes a `case` it would
otherwise not need. What it buys is that `bb` never silently reshapes an
answer, and that a new Bitbucket status value surfaces as itself rather
than being folded into whichever gh word seemed closest.

### `unknown` is a value, not a gap

Both fields keep `unknown`, and it must be returned rather than omitted
whenever the answer cannot be obtained — an endpoint that errors, a
permission the token lacks, a repository with no pipelines configured.

**`none` and `unknown` are different and must stay so.** *No build ever
ran* is a fact about the repository; *I could not read the builds* is a
fact about this call. A consumer showing the first as *no checks* and
the second as *checks unavailable* is making a distinction that only
survives if `bb` makes it first.

**`unknown` must never be reported as `green`.** That is the whole point
of the feature, and the failure mode it exists to prevent.

### The cost these calls carry

`bb pr list` is one API call today. Build statuses are **per commit**, so
a naive implementation turns a list of twenty PRs into twenty-one calls.

**So the fields are opt-in.** They are computed only when named in
`--json`, exactly as `--json` already selects fields. A caller asking for
`number,headRefName` pays nothing; a caller asking for `checks` pays for
what it asked. Bare `--json` (full API objects) is unchanged.

**Where the extra calls are unavoidable, they are bounded**: one per PR
in the list, no retries beyond the client's existing behaviour, and a
failure on one PR yields `UNKNOWN` for that PR rather than failing the
command.

**A long list warns and proceeds.** `bb pr list` paginates, so a
repository with a hundred open PRs turns an opt-in `checks` into a
hundred extra calls. `bb` writes one line to **stderr** saying how many
that will be, and then does it: the caller asked for the field, and
silently refusing to answer would be worse than answering slowly.

A hard cap was considered and rejected. It needs a guessed number, and
worse, it would make `UNKNOWN` mean *too many PRs to check* alongside
*could not read* — one label, two states, which is the defect this whole
plan exists to remove.

### The fixtures are built from a recorded live response

Measured: this skill's suite runs against **fixtures**, not the live API
(`tests/fixtures/`). That makes every assertion below mechanically
checkable without network — and introduces one risk worth naming: a
fixture written from the plan rather than from Bitbucket tests the
author's idea of the API.

So each wave **records one real response first** and pastes it into the
plan before building fixtures against it. One `/statuses` call on a real
commit for wave 1; whatever wave 2's measurement finds for wave 2. It is
a manual step, it happens once per wave, and it is what keeps the suite
honest.

### `bb pr view` reports the same two facts

A single PR is one extra call at most, so `bb pr view <id> --json` gains
both fields on the same terms. The vocabulary is identical — a consumer
must not have to learn two spellings of the same answer.

### What this does not do

**No new subcommand.** These are fields on existing commands, not a
`bb pr checks`.

**No verdict.** `bb` reports what the host says. Deciding whether a
failing check matters, or whether a conflict is the reader's to resolve,
belongs to the consumer — the same split the skill already keeps.

**No change to the ten existing fields**, and no change to `state`'s
Bitbucket spelling (`OPEN`/`MERGED`/…), which the help text documents as
deliberate.

## Branches

### Checks

- `feature/bb-reports-pr-checks` — `checks` on `bb pr list --json` and
  `bb pr view --json`, from commit statuses, opt-in, with `none` and
  `unknown` distinguished

### Mergeability

- `feature/bb-reports-pr-mergeability` — `mergeable` on both commands,
  in the `conflicting | mergeable | unknown` vocabulary

Two waves, sequential. **Checks first**: it is the field with the
clearer source, and it establishes the opt-in cost model that
mergeability then follows. Both touch `bin/bb` and its test suite, and
this repo's CI runs `skills/working-with-bitbucket-api/tests` as its own
job — two branches in that file would rebase against each other for no
gain.

## Done when

- **`bb pr list --json number,checks` reports Bitbucket's own words** for
  commits with successful, failed, in-progress and no statuses. Assert
  all four, spelled as Bitbucket spells them — a mapping to gh's
  vocabulary is the consumer's, not `bb`'s.
- **A failure outranks an in-progress.** Assert a commit carrying both
  reports the failure: the one collapse `bb` performs must not depend on
  status order.
- **`none` and `unknown` are distinguishable.** Assert a PR whose commit
  has no statuses reports `none`, and one whose status call fails
  reports `unknown`. The pairing that matters: an implementation
  returning `none` on error passes every positive assertion and reports
  a clearance it never received.
- **`UNKNOWN` is never reported as `SUCCESSFUL`.** Assert explicitly — it
  is the defect this feature exists to prevent, and the one that put a
  22-day-old unmergeable PR on a board wearing the word *green*.
- **The fields are opt-in.** Assert `--json number,headRefName` issues no
  extra API calls, and that bare `--json` is byte-identical to today.
- **One failing PR does not fail the command.** Assert a list where one
  PR's status call errors: that PR reads `unknown`, the others report
  normally.
- **Wave 2 reports what Bitbucket actually offers, before building
  anything.** The plan does not know whether the API exposes
  mergeability; the wave measures it against a real repository and says
  so. **Finding that no answer exists is a successful outcome** — it
  means `UNKNOWN` is permanently correct there, and the wave ships
  nothing rather than inventing a derivation.
- **If an answer exists**, `mergeable` reports it in Bitbucket's own
  terms, with `UNKNOWN` where the host does not say.
- **A long list warns on stderr and still answers.** Assert the warning
  appears and the field is populated — a hard cap would make `UNKNOWN`
  mean two different things.
- **Each wave's fixtures are built from a recorded live response**, and
  that response is in the plan. The pairing that matters: a fixture
  written from this document tests the author's idea of the API rather
  than the API.
- **`bb pr view` uses the same vocabulary as `bb pr list`**, spelled
  identically — a consumer must not learn two spellings of one answer.
- **The existing ten fields are unchanged**, and `state` keeps its
  Bitbucket spelling.
- **`--help` documents both fields**, including that `unknown` is a real
  answer rather than a failure.
- `pnpm test` in `skills/working-with-bitbucket-api/tests` passes.
- A changeset is present.

## Notes

The trigger was a defect in a consumer, not in `bb`: a board showed a
22-day-old unmergeable PR as *green*. Fixing that is the consumer's work
and is under way there.

What the same measurement exposed is that the consumer's Bitbucket path
**cannot** be fixed: it hard-codes `unknown` for both facts because `bb`
reports neither, and its own comment says so — *"Empty on bitbucket (bb
has no run listing) — unavailable, never 'never failed'."* That comment
is correct today and this plan is what makes it obsolete.

Worth stating plainly: after wave 1 lands, a Bitbucket board can show
what a commit's builds did — in Bitbucket's words, which its adapter
maps as it already maps everything else. Before it, `unknown` is the
honest answer and the only one available.

Wave 2 may find that mergeability has no answer on this host. That would
be worth knowing and worth writing down, and it is the reason the wave
begins with a measurement rather than an implementation. This plan
records what it does not know rather than filling the gap with something
plausible — which is the same discipline it asks of the field itself.

<!-- CHALLENGE-THE-PLAN-METADATA
{
  "round": 1,
  "questionHistory": [
    {"q": "The plan claims the PR object carries conflict state — verified?", "a": "No. Wave 2 measures it first and reports, including that no answer exists", "category": "technical"},
    {"q": "Tests run against fixtures, not the live API — how are the assertions honest?", "a": "Record one real response per wave into the plan, build fixtures from it", "category": "technical"},
    {"q": "bb pr list paginates — 100 PRs means 100 extra calls even opt-in", "a": "Warn on stderr and proceed; a cap would give UNKNOWN two meanings", "category": "nonFunctional"},
    {"q": "gh vocabulary for interoperability, or Bitbucket's own words?", "a": "Bitbucket's — bb is a window on one host, not a gh emulator; the consumer maps", "category": "tradeOffs"}
  ],
  "categoriesCovered": {
    "technical": {"stack": true, "architecture": true, "implementation": true},
    "domain": {"rules": true},
    "nonFunctional": {"performance": true},
    "tradeOffs": true
  }
}
END-CHALLENGE-THE-PLAN-METADATA -->
