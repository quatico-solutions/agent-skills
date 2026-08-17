# `bb pr list` reports whether a PR merges and whether its builds passed

> Add `mergeable` and `checks` to `bb pr list --json`, so a consumer can
> tell a conflicting branch from a green one instead of being told
> `unknown` for both, forever.

## Status

- **Phase:** Draft
- **Type:** feature
- **Sprint:** <!-- optional, filled when plan is added to a sprint -->

## Approval

- **Approved:**
- **Approved by:**
- **Assignee:** jwloka

## Changelog

- `bb pr list --json` gains two gh-style fields — `mergeable` and
  `checks` — derived from Bitbucket's commit statuses and merge
  information rather than hard-coded.
- Both fields keep `unknown` as a real value: absent is never reported as
  a clearance.
- `bb pr view` reports the same two facts for a single PR.

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
reports per-status `state` values (`SUCCESSFUL`, `FAILED`,
`INPROGRESS`, `STOPPED`), which collapse to the four words a consumer
already understands:

| All statuses | `checks` |
|---|---|
| none reported | `none` |
| any failed or stopped | `failing` |
| any in progress | `pending` |
| all successful | `green` |
| endpoint unavailable | `unknown` |

**`mergeable`** — Bitbucket does not expose a single boolean the way
GitHub's `mergeable` does. The PR object carries enough to answer it
(`/2.0/…/pullrequests/{id}` reports merge conflict state on the diff),
and the implementation decides which call answers it most cheaply. What
the plan settles is the **vocabulary**, not the endpoint:

```
conflicting | mergeable | unknown
```

matching what the consumer's adapter already expects from `gh`.

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
failure on one PR yields `unknown` for that PR rather than failing the
command.

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

- **`bb pr list --json number,checks` reports the four words** for
  repositories with successful, failed, in-progress and no builds.
  Assert all four.
- **`none` and `unknown` are distinguishable.** Assert a PR whose commit
  has no statuses reports `none`, and one whose status call fails
  reports `unknown`. The pairing that matters: an implementation
  returning `none` on error passes every positive assertion and reports
  a clearance it never received.
- **`unknown` is never reported as `green`.** Assert explicitly — it is
  the defect this feature exists to prevent.
- **The fields are opt-in.** Assert `--json number,headRefName` issues no
  extra API calls, and that bare `--json` is byte-identical to today.
- **One failing PR does not fail the command.** Assert a list where one
  PR's status call errors: that PR reads `unknown`, the others report
  normally.
- **`mergeable` reports `conflicting` for a PR with merge conflicts**,
  `mergeable` for a clean one, and `unknown` where the host does not say.
- **`bb pr view` uses the same two vocabularies**, spelled identically.
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

Worth stating plainly: after this lands, a Bitbucket board can show the
same four PR conditions a GitHub board shows. Before it, `unknown` is the
honest answer and the only one available.
