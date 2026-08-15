# adopt-agentic-workflow — developer notes

Sets up the four-phase workflow in a repository. `SKILL.md` is the
agent-facing instruction; this file is why it is shaped this way.

## Where this came from

Adopting the workflow used to mean pasting a long prompt into a fresh session.
That prompt hardcoded per-repo parameters for two specific projects, cited a
reference repo to copy-adapt from, pinned a Plot version, and mixed generic
plan-lifecycle setup with this organisation's conventions.

It worked, and it was validated twice — but it could only be maintained by
editing prose, and it went stale on every Plot release. By the time it was
replaced it still named `plot 1.6.0` and required plan front-matter keys the
parser no longer reads.

## The split

Plot gained `/plot-init`, which probes a repo and sets up the plan lifecycle
generically. Everything in the old prompt divides cleanly along one line:

| Belongs to Plot | Belongs here |
|---|---|
| Plan directories, indexes, `.gitkeep` anchors | Which skill serves which phase |
| `## Plot Config`, branch prefixes, posture keys | The Definition of Done |
| Plugin settings merge | Bitbucket vs GitHub conventions |
| Detecting host, gates, ticket scheme, commit style | Session-log conventions |
| The four plan states | The four *activities* and their tooling |

**The dependency runs one way.** This skill invokes `/plot-init`; Plot must
never reference this skill or anything else org-specific — that is Plot's
Principle 5, and violating it would make Plot unusable outside this
organisation.

## Why the phase map is the point

Everything else this skill does could be argued to belong elsewhere. The
phase-to-skill map cannot: it is knowledge that exists nowhere in either repo.

`triage-ticket` does not know it is a Discovery tool. `commit-notation` does
not know it belongs to Development. Plot knows its plan states but nothing
about our skills. A newcomer — or an agent starting fresh in the repo — has no
way to infer which tool serves which moment.

That map is what turns a set of installed skills into a workflow, and writing
it into the hub is why this skill exists.

## Reference, never duplicate

The original prompt carried a full `bb`-versus-`gh` command table to be copied
into each target repo. That is now a pointer to `working-with-bitbucket-api`.

Copied tables go stale the day the tool changes, and then two sources
disagree — which is worse than one source being briefly wrong, because nobody
knows which to trust. Plot's `plot-host.sh` already abstracts the host CLI, so
skills never need the translation; the note that remains is only for agents
reaching for `gh` out of habit.

## Session logs: supply, don't write

`bye` reconstructs compacted session history, classifies session types, and
guards against parallel sessions. A plan-shaped tool cannot do any of that, so
building a second log writer would produce two partial logs instead of one
good one.

Plot's `plot-context.sh` supplies the plot-shaped facts (governing plan, phase,
wave, PRs) and `bye` writes the log. The `## Session Wrap Up` hub section is
the seam — `bye` already looks for exactly that heading.

## What is deliberately not here

- **A `reality-checker` agent.** Plot's Principle 12 ("evidence over
  assertion") states the stance, and `/plot-deliver` acts on it by asking its
  subagents to *refute* deliverables rather than confirm them. An agent that
  checks *our* Definition of Done would be a separate skill; it is not part of
  adoption.
- **The repo parameters** from the original prompt (`QUACDS`, `pnpm dist`,
  specific project names). `/plot-init` detects what it can and asks about the
  rest.
- **A migration step.** Adoption is additive. Moving someone's existing plans
  destroys both their history and their own organisation of it.

## Known gaps

- No automated test. This is an instruction skill whose output is prose in a
  hub doc; the meaningful verification is running it against a real repo.
- The phase map is written once at adoption and does not track later skill
  additions — a repo that installs a new Discovery tool must update its own
  hub.
- Assumes Plot is reachable. If it is installed as a plugin *this* session,
  its slash commands only activate in the next one.
