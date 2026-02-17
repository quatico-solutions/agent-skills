---
name: show-your-work
description: >-
  Use when the user says "show your work", "make a demo", "prove it works",
  "demonstrate the feature", "capture the evidence", "showboat", or "rodney".
  Also triggers on: demo this, demo time, show what you built, show me the
  results, prove your changes work, record what you did, write up what you
  built, document the results, demonstrate the fix, demonstrate what changed.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.2"
---

# Show Your Work

Build a reproducible demo document that proves completed work — tests passing, UI correct, changes verified.

**Tools:** **showboat** (docs) + **rodney** or project-native tools (screenshots). Setup: `./install-dependencies.sh`. Commands: `showboat --help`, `rodney --help`.

## When to Use

**Reactive** (work complete): Review what changed (`git diff`, task context), capture evidence retrospectively.

**Proactive** (still implementing): Add a "Demo" subsection to the plan, build the document as each step completes.

**When NOT to use:**
- Trivial changes (config tweaks, dependency bumps)
- User explicitly declined a demo
- Pure internal refactoring with no user-facing behavior

## Workflow Checklist

```
- [ ] showboat --help (verify tool available)
- [ ] showboat init docs/demos/YYYY-MM-DD-<slug>.md "Title"
- [ ] showboat note — what changed and why
- [ ] showboat exec — test runs, build output, key commands
- [ ] Screenshots if UI changed (see tool selection below)
- [ ] showboat verify — re-run if outputs changed
- [ ] Commit (D intention, one atomic commit with images)
- [ ] Offer to attach key sections to PR description
```

## Screenshots

**Prefer project-native tools** over rodney:

| If the project uses... | Use for screenshots |
|------------------------|---------------------|
| Playwright (BDD tests, MCP debugging) | Playwright screenshot API or test artifacts |
| Cypress | Test runner output or `cy.screenshot()` |
| Other test runner with screenshots | Reuse existing test artifacts |
| None of the above | `uvx rodney` (see `rodney --help`) |

Embed with `showboat image <doc> <image-path>`.

## Output Location

| Situation | Location | Committed? |
|-----------|----------|------------|
| Default | `docs/demos/` | Yes |
| User specifies non-git destination | `tmp/` | No |
| Project rules specify another location | Follow project rules | Depends |

**Naming:** `YYYY-MM-DD-<slug>.md`, images as `*-<description>.png`.

## Attaching to Pull Requests

**Offer** to embed key sections in the PR description under a `## Demo` heading. Do NOT force-attach — ask first. See **handling-pull-requests** skill.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping `showboat verify` | Always verify before commit |
| Demo in `tmp/` when it should be committed | Default to `docs/demos/`; `tmp/` only for non-git destinations |
| Duplicating tool flags in this skill | Run `--help` at runtime |

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `commit-notation` | Demo commits use `D` intention (documentation) |
| `commit` | Demo document + images = one atomic commit |
| `handling-pull-requests` | Offer to embed demo highlights in PR description |
| Plan review skills | Suggest adding a demo step when reviewing plans |
| `double-loop-bdd-tdd` | BDD test screenshots feed into showboat documents |
