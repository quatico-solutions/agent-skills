# Agent Skills

Shared skills for AI-assisted development with Claude Code and Cursor.

## Install

Install as a plugin (recommended — auto-updates) or via the `skills` CLI.

### Claude Code

```
/plugin marketplace add quatico-solutions/agent-skills
/plugin install quatico-skills@quatico-marketplace
```

### Cursor

In **Settings → Plugins**, add a marketplace and paste this repo URL:

```
https://github.com/quatico-solutions/agent-skills
```

Then install the **quatico-skills** plugin. It auto-updates when the marketplace refreshes.

### Any agent (`skills` CLI)

The [`skills`](https://www.npmjs.com/package/skills) CLI installs into Claude Code, Cursor, and other agents — it prompts for which skills and which agents:

```bash
npx skills@latest add quatico-solutions/agent-skills
```

Non-interactive (all skills, one agent):

```bash
npx skills add https://github.com/quatico-solutions/agent-skills.git --global --agent claude-code --all --yes
```

## Skills

The `quatico-skills` plugin bundles all 17 skills below, each linked to its
directory. The table must stay in sync with the `skills/` directory.

> **Moved skills:** `story-tracking` now ships with **[plot-pm/plot](https://github.com/plot-pm/plot)** — stories and plans are sibling concepts, so it lives with the Plot workflow.

### quatico-skills (17 skills)

| Skill | Description |
|-------|-------------|
| [`bye`](skills/bye) | Session wrap-up: document accomplishments, handle git commits, summarize next steps. Vendored from [eins78/skills](https://github.com/eins78/skills/tree/main/skills/bye) |
| [`branch-and-commit`](skills/branch-and-commit) | Intelligently groups uncommitted changes into atomic commits with proper notation, creates feature branches, and prepares for PR |
| [`challenge-the-plan`](skills/challenge-the-plan) | Deep plan interrogation: adaptive interviews across technical, domain, UX, non-functional dimensions |
| [`commit`](skills/commit) | When and what to commit: timing, atomic commits, git hooks, skip policies |
| [`commit-notation`](skills/commit-notation) | Quatico's commit notation (Arlo's v1 + extensions) for structured commit messages. [Source](https://github.com/quatico-solutions/QuaticoCommitNotation) |
| [`handling-pull-requests`](skills/handling-pull-requests) | PR workflow guidance: creating PRs, addressing review feedback, reply conventions |
| [`jest-testing-conventions`](skills/jest-testing-conventions) | Jest unit testing: jest.fn/spyOn/mock, clear/reset/restore, AAA pattern, fake timers |
| [`markdown`](skills/markdown) | CommonMark + Bitbucket syntax reference — no GFM task lists or strikethrough |
| [`show-your-work`](skills/show-your-work) | Executable demo documents proving completed work (showboat + rodney) |
| [`test-driven-development`](skills/test-driven-development) | TDD workflow: Red-Green-Refactor, Iron Laws, rationalizations, anti-patterns |
| [`triage-ticket`](skills/triage-ticket) | Triage JIRA tickets (bugs or feature requests): assess readiness, scope, risks, propose solutions |
| [`typescript-strict-patterns`](skills/typescript-strict-patterns) | Strict TypeScript patterns: discriminated unions, branded types, Zod at boundaries, const arrays over enums. Adopted from [eins78/agent-skills](https://github.com/eins78/agent-skills) |
| [`working-with-bitbucket-api`](skills/working-with-bitbucket-api) | Bitbucket Cloud API via `bb` CLI — PR operations, image uploads, source browsing. Requires `install-dependencies.sh` |
| [`working-with-bitbucket-web`](skills/working-with-bitbucket-web) | Bitbucket web UI navigation (elements, rich text editor, comment threads) |
| [`working-with-jira-web`](skills/working-with-jira-web) | JIRA web UI navigation (create issues, fill forms, link tickets, wiki markup) |
| [`schweizer-schreibweise`](skills/schweizer-schreibweise) | Swiss Standard German (DE-CH) writing conventions: orthography (ss not ß), typography (guillemets, apostrophe thousands, CHF prefix), grammar, and Helvetismen vocabulary |
| [`writing-clearly-and-concisely`](skills/writing-clearly-and-concisely) | Strunk's *Elements of Style* (1918) for clear prose—docs, commits, error messages, UI text. [Source](https://github.com/obra/the-elements-of-style) |

**Usage tips:**

- `branch-and-commit`: `"organize my uncommitted changes into commits"`
- `writing-clearly-and-concisely`: Works on any prose — `"rewrite @README.md using /writing-clearly-and-concisely"`
- `handling-pull-requests`: Can drive review responses end-to-end — `"use /chrome to address my review comments"`
- `challenge-the-plan`: Accepts a plan path as argument, or auto-searches for PLAN/SPEC/STORY files
- `commit` + `commit-notation`: Complementary — `commit` covers timing and composition, `commit-notation` covers message format
- `show-your-work`: `"show your work"` — creates executable demo docs with screenshots and command output
- `markdown`: Pairs with the `story-tracking` skill from [plot-pm/plot](https://github.com/plot-pm/plot) — that skill covers story structure, `markdown` covers syntax
- `working-with-bitbucket-api` + `working-with-bitbucket-web`: Complementary — API skill handles PR operations, image uploads, and source browsing via `bb` CLI; web skill is a fallback for SSO-gated pages. Run `install-dependencies.sh` to set up `bb`
- `working-with-jira-web`: Requires native browser tools (Claude in Chrome / Cursor Browser) — MCP browser tools can't handle SSO

## Creating Skills

Skills teach Claude specialized tasks. [Official docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for full details.

### Quick Start

```
my-skill/
├── SKILL.md                  # Required: frontmatter + instructions
├── README.md                 # Required: development notes, design decisions, testing history
├── REFERENCE.md              # Optional: detailed reference material (>100 lines)
└── install-dependencies.sh   # Required if skill has external dependencies (CLI tools, runtimes)
```

### SKILL.md Template

```yaml
---
name: my-skill-name     # lowercase, hyphens, max 64 chars, must match directory
description: "What it does and when to use it. Include trigger keywords. (max 1024 chars)"
# Optional fields per agentskills.io spec:
compatibility: claude-code, cursor
license: MIT
metadata:
  source: https://github.com/your-org/your-repo
  version: "1.0.0"
---

# My Skill Name

[Instructions here—keep under 500 lines]

See [REFERENCE.md](REFERENCE.md) for details.
```

**Note:** Reference files over 100 lines should include a table of contents.

### Key Principles

1. **Be concise** - Only add what Claude doesn't already know
2. **Progressive disclosure** - Overview in SKILL.md, details in referenced files
3. **Third person** - "Processes files" not "I help you process files"
4. **One level deep** - Reference files directly from SKILL.md, avoid nesting
5. **Use checklists** - Multi-step workflows benefit from copy-paste checklists
6. **Test across models** - Haiku may need more guidance than Opus

### Skill Composition

Skills can reference other skills by name in their instructions:

```markdown
## Committing Your Fix

When ready to commit, use the **commit-notation** skill:
- Bugfixes use `B` intention
- Risk level depends on test coverage
```

Claude loads both skills when context matches. No formal import system—just mention by name.

### Official Resources

**Specification & Docs:**

- [Agent Skills Specification](https://agentskills.io) - Open standard format
- [Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) - Anthropic's authoring guide
- [Claude Code Skills](https://code.claude.com/docs/en/skills) - Claude Code integration

**Example Skills & Tools:**

- [Anthropic Skills Repository](https://github.com/anthropics/skills) - Official example skills
- [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) - Scaffolding tool for new skills

**Installing Official Skills (Claude Code):**

```bash
# Register marketplace
/plugin marketplace add anthropics/skills

# Install skill packs
/plugin install document-skills@anthropic-agent-skills   # PDF, DOCX, PPTX, XLSX
/plugin install example-skills@anthropic-agent-skills    # Creative, technical, enterprise
```

## Hooks

Claude Code hooks in `.claude/settings.json` automate workflows. [Official docs](https://code.claude.com/docs/en/hooks).

> **Note:** Hooks are Claude Code only (no Cursor equivalent yet). This is a deliberate deviation from cross-compatibility rules—hooks are experimental and worth exploring.

### Commit Notation Hook

Add to your `.claude/settings.json` (project or `~/.claude/settings.json` global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "If this command is a git commit, ensure the commit message uses Quatico's commit notation: [risk][intention] Summary. Risk levels: lowercase=safe, UPPERCASE=validated, XX!!=risky, XX**=broken. Intentions: F=feature, B=bugfix, R=refactoring, D=docs, A=automated. Example: 'F - Add user login endpoint'. Use the commit-notation skill for details."
          }
        ]
      }
    ]
  }
}
```

### Adding Hooks

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Your reminder or context injection here"
          }
        ]
      }
    ]
  }
}
```

**Hook types:**

- `command`: Run a bash command
- `prompt`: Inject context for Claude to consider

**Events:** `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`
