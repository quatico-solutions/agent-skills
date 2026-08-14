# reality-check — developer notes

Adversarial verification of claims. `SKILL.md` is the agent-facing
instruction; this file is why it is shaped this way.

## Where this came from

The predecessor was a `reality-checker` **agent** — a subagent persona copied
into each target repo, carrying that repo's Definition of Done and commit
notation in its own definition. Two problems: it had to be re-adapted per repo
(and drifted when the DoD changed), and adapting it wrongly made it flag
correct commits as violations.

This is a **skill** instead, and the difference matters: the skill tells the
main agent to *dispatch* separate refuters and how to brief them, rather than
being the checker itself. Nothing about the target repo is baked in — the DoD
is read at run time from wherever the repo keeps it.

## Why refute rather than confirm

This shape was not designed; it was observed. Two adversarial audits ran
against a feature in a sibling repo, and both found things its author had
checked and cleared:

- The first found that a supposedly-atomic locking mechanism provided **no
  mutual exclusion at all**. 135 passing tests coexisted with it, because no
  test exercised the contested case — the one the mechanism existed for.
- The second audited the *fix* and found the detection it introduced could be
  fooled by a commit subject, such that the tool offered to **delete a branch
  holding real, unmerged work**.

Both times the author had inspected the same code and concluded it was fine.
Both times the finding came from *executing* in a throwaway repo, not from
reading.

The pattern generalises: an agent reading its own mechanism uses the mental
model that wrote it, so reading confirms and only execution can contradict.
That is why every brief in this skill is phrased as "prove this is false", and
why reports must separate **executed** from **read**.

## Why a separate agent

An agent verifying its own conclusion carries the error that produced it. In
the first audit the author had personally probed the same weakness and
dismissed it as "wording too strong" — the separate agent went further, ran two
real processes, and saw both win a race that should have had one winner.

This cannot be enforced, only instructed. It is the one part of the skill that
depends on the operator actually dispatching subagents rather than reasoning in
place.

## The revert test

Step 4 asks: revert the fix, does a test go red? It is cheap and it answers a
question nothing else does — whether the fix is *protected* or merely present.

It earned its place: in the second audit, reverting a `--max` validation guard
left the entire suite green, revealing an untested surface nobody had noticed.

## Deliberately not included

- **A fixed Definition of Done.** Read at run time, or asked for. Baking one
  in is what made the predecessor drift.
- **A verdict vocabulary beyond REFUTED / SUPPORTED / UNVERIFIABLE.** Three
  states are enough, and UNVERIFIABLE is the one that keeps the report honest.
- **Automatic invocation.** This is deliberately human-triggered: run
  everywhere and it becomes noise people skip.

## Relationship to Plot

Plot's Manifesto Principle 12 ("evidence over assertion") states the same
stance for plan delivery, and `/plot-deliver` applies it when checking whether
a plan's promises were kept. This skill is the general form, usable on any
claim in any repo, with or without Plot.

## Known gaps

- No automated test. It is an instruction skill; its output is a report, and
  the meaningful verification is using it on real work.
- Cannot force separateness. A main agent that reasons in place instead of
  dispatching subagents gets a worse check and no warning.
- Says nothing about *how many* refuters a claim deserves. Three independent
  ones for a load-bearing claim, one for a routine one, is a reasonable rule of
  thumb that is not yet written down.
