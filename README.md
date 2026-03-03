# Claude Code & Cursor Configuration

Shared skills for AI-assisted development with Claude Code and Cursor.

## Setup

```bash
# Claude Code
pnpx skills add git@bitbucket.org:quatico/config.git -g -a claude-code --all -y && pnpx skills add eins78/skills -g -a claude-code -s bye -y
```

```bash
# Cursor (run after the above — copies skills for Cursor compatibility)
for s in ~/.agents/skills/*/; do n=$(basename "$s"); rm -rf ~/.cursor/skills/"$n" && cp -r "$s" ~/.cursor/skills/"$n"; done
```

Re-run to update after pulling changes.

## Skills

Reusable skills in `skills/`.

| Skill | Description |
|-------|-------------|
| `commit-notation` | Quatico's commit notation (Arlo's v1 + extensions) for structured commit messages. [Source](https://github.com/quatico-solutions/QuaticoCommitNotation) |
| `commit` | When and what to commit: timing, atomic commits, git hooks, skip policies |
| `branch-and-commit` | Intelligently groups uncommitted changes into atomic commits with proper notation, creates feature branches, and prepares for PR |
| `double-loop-bdd-tdd` | Outside-in development with nested BDD/TDD loops for user stories and integration work |
| `test-driven-development` | TDD workflow: Red-Green-Refactor, Iron Laws, rationalizations, anti-patterns |
| `writing-bdd-scenarios` | Gherkin feature files: structure, Given-When-Then, business language, data tables, tags |
| `implementing-bdd-scenarios` | Step definitions, Page Objects, async handling, selectors, waiting strategies |
| `jest-testing-conventions` | Jest unit testing: jest.fn/spyOn/mock, clear/reset/restore, AAA pattern, fake timers |
| `handling-pull-requests` | PR workflow guidance: creating PRs, addressing review feedback, reply conventions |
| `working-with-bitbucket-api` | Bitbucket Cloud API via `bb` CLI — PR operations (list, view, create, diff, status, activity, comment, approve, merge), source browsing (ls, cat, branches, tags, search, commits, diff). Requires `install-dependencies.sh`. Agent must verify `bb` is installed before use and guide user through setup if missing |
| `working-with-bitbucket-web` | Bitbucket web UI navigation (elements, rich text editor, comment threads) |
| `working-with-jira-web` | JIRA web UI navigation (create issues, fill forms, link tickets, wiki markup) |
| `writing-clearly-and-concisely` | Strunk's *Elements of Style* (1918) for clear prose—docs, commits, error messages, UI text. [Source](https://github.com/obra/the-elements-of-style) |
| `agents-md-maintenance` | Maintain AGENTS.md hub-and-spoke integrity: detect drift, broken references, duplicates |
| `quatico-sso-auth` | Handles SSO authentication for internal tools (Keycloak + Google SSO) |
| `styling-wbcomponents` | Theming with starter-theme starter: multi-tier token system, DS token theming, shadow DOM patterns |
| `forms-with-wbcomponents` | Building forms: Form/Field components, validation, multi-step wizards, conditional fields |
| `init-agent` | Systematic CLAUDE.md creation through project exploration, ecosystem discovery, and rule synthesis |
| `consolidate-agent-rules` | Transform verbose agent rules into AGENTS.md hub-and-spoke pattern with 3 verification loops |
| `triage-ticket` | Triage JIRA tickets (bugs or feature requests): assess readiness, scope, risks, propose solutions |
| `challenge-the-plan` | Deep plan interrogation: adaptive interviews across technical, domain, UX, non-functional dimensions |
| `show-your-work` | Executable demo documents proving completed work (showboat + rodney) |
| `story-tracking` | Multi-session tracking for complex tasks — markdown folders with scripts, test plans, and session logs, linked to JIRA |
| `markdown` | CommonMark + Bitbucket syntax reference — no GFM task lists or strikethrough |
| `bye` | Session wrap-up: document accomplishments, handle git commits, summarize next steps |

`bye` is installed from [eins78/skills](https://github.com/eins78/skills/tree/main/skills/bye) via the setup command.

**Usage tips:**

- `branch-and-commit`: `"organize my uncommitted changes into commits"`
- `writing-clearly-and-concisely`: Works on any prose — `"rewrite @README.md using /writing-clearly-and-concisely"`
- `styling-wbcomponents`: Also useful for reviews, not just development — `"review this PR according to /styling-wbcomponents"`
- `handling-pull-requests`: Can drive review responses end-to-end — `"use /chrome to address my review comments"`
- `challenge-the-plan`: Accepts a plan path as argument, or auto-searches for PLAN/SPEC/STORY files
- `commit` + `commit-notation`: Complementary — `commit` covers timing and composition, `commit-notation` covers message format
- `show-your-work`: `"show your work"` — creates executable demo docs with screenshots and command output
- `story-tracking`: `"continue on FOOBAR-1234"` or `"create a story for the WCAG audit"`
- `story-tracking` + `markdown`: Complementary — `story-tracking` covers structure, `markdown` covers syntax
- `working-with-bitbucket-api` + `working-with-bitbucket-web`: Complementary — API skill handles PR operations and source browsing via `bb` CLI, web skill handles rich text and images. Run `install-dependencies.sh` to set up `bb`
- `working-with-jira-web`, `quatico-sso-auth`: Require native browser tools (Claude in Chrome / Cursor Browser) — MCP browser tools can't handle SSO

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
description: What it does and when to use it. Include trigger keywords. (max 1024 chars)
# Optional fields per agentskills.io spec:
compatibility: claude-code, cursor
license: MIT
metadata:
  source: https://github.com/your-org/your-repo
  version: "1.0"
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
