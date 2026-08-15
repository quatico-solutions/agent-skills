---
name: reality-check
description: "Use before claiming work is done, before merging, or when a claim matters and has not been executed: dispatches separate adversarial subagents to REFUTE each claim and report what they executed versus what they only read. Triggers: reality check, verify claims, is this really done, prove it works, check before merge, adversarial review, did we actually ship this."
license: MIT
compatibility: claude-code, cursor
metadata:
  version: "1.1.0"
---

# Reality Check

Verify claims by trying to **disprove** them, with agents that did not make
them.

## Why this exists, and why it is not just "review it again"

An agent that inspects its own mechanism will usually conclude it works,
because the mental model it uses to read is the same one it used to write.
Reading code and judging it is not the same as running it and seeing what
happens — only execution can contradict the model.

Two consequences shape everything below:

**A green test suite proves only what it tests.** A suite can be entirely green
while the central mechanism is broken, if the untested case is precisely the
one the mechanism exists for. When a claim matters, ask which test would fail
if it were false; if the answer is none, the claim is unverified however many
tests pass.

**Checking your own work shares the blind spot that produced it.** The useful
instruction is not "confirm this" but *"try to prove this is false."* An agent
asked "does this PR cover deliverable N?" pattern-matches its way to yes; one
asked to refute it has to go and look.

## When to run this

- Before claiming a piece of work is complete
- Before merging something whose failure would be expensive
- When a changelog or plan promises behaviour nobody executed
- After a fix — **fixes are where regressions hide**, and the fixer is the
  worst-placed person to find them

Not needed for work whose correctness is obvious on its face, or already
covered by a test that would fail if the claim were false.

## Steps

### 1. Collect the claims

From whatever states them: a plan's `## Changelog`, a PR description, a
release checklist, or the user directly. Number them. A claim is a statement
that could be false — "the queue orders branches by wave" is a claim; "improved
the code" is not, and should be dropped rather than checked.

### 2. Establish the Definition of Done

Read it, do not assume it:

- `CLAUDE.md` / `AGENTS.md` — look for a Definition of Done section
- `docs/definition-of-done.md` where the repo keeps one
- `package.json` scripts for the actual gate commands

If no DoD is written down, **ask** rather than inventing one. A check against
invented criteria produces confident nonsense.

### 3. Dispatch separate refuters — one per claim

**Use a subagent per claim, in parallel, and give each the refuting brief.**
Separateness is the point: an agent verifying its own conclusion carries the
error that produced it.

> Claim N: "<exact text>". Your job is to establish this is **false**.
> Run whatever proves it — the command, the test, the flag, the actual
> behaviour in a throwaway repo. Do not stop at reading the diff.
>
> Report:
> - **REFUTED** — with the evidence of absence or of contrary behaviour
> - **SUPPORTED** — naming the specific file/hunk/command output
> - **UNVERIFIABLE** — say why, do not guess
>
> State separately what you **EXECUTED** and what you only **READ**. A
> behaviour claim confirmed by reading is not confirmed.

For behaviour claims, running it in a throwaway repo under `/tmp` beats reading
the implementation, every time. That is how the sharpest findings surface.

### 4. Try to break each fix

Where the claim is "X is fixed", the strongest check is reverting the fix and
confirming a test goes red. If nothing fails, the fix is unprotected — say so:
it is a finding in its own right, not a footnote.

### 5. Report — verified separately from inferred

Structure the report so a reader can tell evidence from opinion:

- **Confirmed problems** — file:line, reproduction, observed output
- **Held up** — claims that survived a genuine attempt to refute them, stated
  explicitly so they are not re-litigated
- **Unverified** — what could not be established, and why
- **Untested surfaces** — fixes that no test would catch if reverted

Rank by severity, and say plainly whether the work is ready. **"NEEDS WORK" is
an acceptable and expected outcome** — a check that always passes is not a
check.

## Guardrails

- **Never verify your own work alone.** Dispatch separate agents; that is the
  whole mechanism.
- **Never accept a reading as proof of behaviour.** "The diff appears to add
  it" is not evidence that it works.
- **Never invent the Definition of Done.** Read it or ask.
- **Never soften a finding to be agreeable.** The value is in what it catches.
- **Report what you could not check.** Silence about a gap reads as a pass.

## Common Mistakes

| Mistake | Effect | Prevention |
|---------|--------|------------|
| Asking subagents to *confirm* rather than refute | They pattern-match to yes; the check finds nothing | Phrase every brief as "prove this is false" |
| Reading the implementation instead of running it | Confirms the author's mental model rather than testing it | For behaviour claims, execute in a throwaway repo |
| Treating a green suite as proof | Green covers the tested cases and is silent on the rest | Ask which test would fail if the claim were false |
| Checking your own fix | Shares the blind spot that produced it | Separate agent, refuting brief |
| Reporting only problems | The reader cannot tell what was actually verified | List what held up, and what stayed unverified |
| Skipping the revert test on a fix | An unprotected fix silently regresses later | Revert it; if nothing goes red, that is a finding |
