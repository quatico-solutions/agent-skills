---
name: show-your-work
description: >-
  Use when the user says "show your work" to create executable demo documents
  proving completed features or bug fixes with command output and browser
  screenshots. Triggers: show your work, make a demo, create a demo, demo this,
  demo time, demonstrate the feature, demonstrate the fix, demonstrate what changed,
  show what you built, show me the results, prove it works, prove your changes work,
  prove the fix works, record what you did, write up what you built, capture the
  evidence, document the results, showboat, rodney.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.1"
---

# Show Your Work

Create executable demo documents that prove completed work — tests passing, UI rendering correctly, changes working as intended.

Uses **showboat** for document assembly and **rodney** (or project-native tools) for browser screenshots. Run `./install-dependencies.sh` for one-time setup.

> **"The `--help` text acts like a Skill."** — Run `showboat --help` and `rodney --help` at runtime for full command reference. This skill covers WHEN and WHY, not HOW to use the tools.

## When to Use

```dot
digraph when_to_use {
    rankdir=TB;
    node [shape=diamond fontname="Helvetica"];

    start [label="User said\n'show your work'?" shape=ellipse];
    q1 [label="Work already\ncomplete?"];

    node [shape=box];
    proactive [label="Proactive Mode\n(build alongside work)"];
    reactive [label="Reactive Mode\n(capture after completion)"];

    start -> q1;
    q1 -> reactive [label="yes"];
    q1 -> proactive [label="no, still planning\nor implementing"];
}
```

| Trigger Phrase | Mode |
|---------------|------|
| "show your work" | Either (depends on timing) |
| "make a demo", "create a demo", "demo this", "demo time" | Either |
| "demonstrate the feature/fix/what changed" | Either |
| "show what you built", "show me the results" | Reactive |
| "prove it works", "prove your changes work", "prove the fix works" | Reactive |
| "record what you did", "write up what you built" | Reactive |
| "capture the evidence", "document the results" | Reactive |

## Two Modes

**Proactive** (during planning): Add a "Demo" section to the implementation plan listing which commands to capture and which screenshots to take. Build the showboat document incrementally as each step completes.

**Reactive** (after completion): Review what was accomplished (`git diff`, task context), then build the demo document retrospectively — re-run key commands and capture the final state.

## Workflow

```dot
digraph workflow {
    rankdir=TB;
    compound=true;
    node [shape=box fontname="Helvetica"];

    trigger [label="Trigger:\n'show your work'" shape=ellipse];

    subgraph cluster_setup {
        label="Setup";
        style=filled;
        fillcolor="#fff8e1";
        check [label="Check prerequisites\nshowboat --help"];
        init [label="showboat init\ndocs/demos/YYYY-MM-DD-slug.md"];
    }

    subgraph cluster_capture {
        label="Capture Evidence";
        style=filled;
        fillcolor="#e3f2fd";
        context [label="showboat note\n(what changed, why)"];
        tests [label="showboat exec\n(test commands, build, lint)"];
        screenshots [label="Screenshots\n(project tools or rodney)"];
    }

    subgraph cluster_finalize {
        label="Finalize";
        style=filled;
        fillcolor="#c8e6c9";
        verify [label="showboat verify"];
        commit_doc [label="git commit\nD: Add demo"];
        offer_pr [label="Offer PR\nattachment?" shape=diamond];
    }

    done [label="Done" shape=ellipse];

    trigger -> check;
    check -> init;
    init -> context;
    context -> tests;
    tests -> screenshots;
    screenshots -> verify;
    verify -> commit_doc [label="pass"];
    verify -> screenshots [label="mismatch\nfix + re-capture"];
    commit_doc -> offer_pr;
    offer_pr -> done;
}
```

### Checklist

```
- [ ] Check prerequisites (showboat --help)
- [ ] showboat init docs/demos/YYYY-MM-DD-<slug>.md "Title"
- [ ] showboat note — what changed and why
- [ ] showboat exec — test runs, build output, API calls
- [ ] Screenshots if UI changed (see tool selection below)
- [ ] showboat verify — confirm outputs are reproducible
- [ ] Commit demo (commit-notation: D intention)
- [ ] Offer to attach key sections to PR description
```

## Screenshots

**Prefer tools already in the project** — avoids adding dependencies and reuses existing test infrastructure.

| If the project uses... | Use for screenshots |
|------------------------|---------------------|
| Playwright (BDD tests, MCP debugging) | Reuse test artifacts or Playwright's screenshot API |
| Cypress | Test runner output or `cy.screenshot()` |
| Other test runner with screenshots | Reuse existing test artifacts |
| None of the above | `uvx rodney` (see `rodney --help`) |

Embed any screenshot into the showboat document with `showboat image <doc> <image-path>`.

## Output Location

| Situation | Location | Committed? |
|-----------|----------|------------|
| Default | `docs/demos/` | Yes |
| User specifies non-git destination | `tmp/` | No |
| Project rules specify another location | Follow project rules | Depends |

**File naming:** `docs/demos/YYYY-MM-DD-<slug>.md` with images alongside as `*-<description>.png`.

## Attaching to Pull Requests

After creating the demo, **offer** to embed key sections (test output, screenshots) in the PR description under a `## Demo` heading. Cross-reference with **handling-pull-requests** skill for PR conventions.

Do NOT force-attach — ask: "Would you like me to add demo highlights to the PR description?"

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping `showboat verify` | Always verify before committing — catches output drift |
| Demo in `tmp/` when it should be committed | Default is `docs/demos/`. Use `tmp/` only for non-git destinations |
| Duplicating tool flags in this skill | Read `--help` at runtime — keeps skill lean and up-to-date |

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `commit-notation` | Demo commits use `D` intention (documentation) |
| `commit` | Demo document + images = one atomic commit |
| `handling-pull-requests` | Offer to embed demo highlights in PR description |
| Plan review skills | When reviewing a plan, suggest adding a demo step if none exists |
| `double-loop-bdd-tdd` | BDD test screenshots can feed directly into showboat documents |
