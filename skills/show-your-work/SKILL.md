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
  version: "1.0.0"
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
- [ ] Commit demo + images (D intention, droppable on merge)
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

## Sharing the Demo

**PR attachment:** Offer to embed key sections in the PR description under a `## Demo` heading. Do NOT force-attach — ask first. See **handling-pull-requests** skill.

**Gist fallback** (`gh` is repo-agnostic — works even when the project is on Bitbucket/GitLab):

If no PR exists or the user declines attachment, offer to share as a gist. Ask visibility preference (private/public).

1. Create gist with markdown only: `gh gist create [--public] <demo>.md`
2. If the demo has images:
   - Clone: `gh gist clone <id> /tmp/gist-<id>`
   - Copy demo as `readme.md` (auto-pinned to top since 2025-03) and images into clone
   - `git add`, commit, push
   - Update `readme.md` image refs to raw URLs: `https://gist.githubusercontent.com/<user>/<id>/raw/<sha>/<file>`
   - Push updated markdown, then `trash /tmp/gist-<id>`

Gist file sort order: `!#-.` → digits → `_` → alpha. Name the demo `readme.md` so it pins above image files.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping `showboat verify` | Always verify before commit |
| Demo in `tmp/` when it should be committed | Default to `docs/demos/`; `tmp/` only for non-git destinations |
| Duplicating tool flags in this skill | Run `--help` at runtime |
| Passing images to `gh gist create` | Binary files rejected — clone gist repo, push images via git |
| Demo file sorts below images in gist | Name the demo `readme.md` — auto-pinned to top since 2025-03 |

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `commit-notation` | Demo commits use `D` intention (documentation) |
| `commit` | One commit near the end; squash on updates; droppable if merging without demo |
| `handling-pull-requests` | Offer to embed demo highlights in PR description |
| Plan review skills | Suggest adding a demo step when reviewing plans |
| `double-loop-bdd-tdd` | BDD test screenshots feed into showboat documents |
