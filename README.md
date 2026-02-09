# Claude Code & Cursor Configuration

Shared commands and skills for AI-assisted development with Claude Code and Cursor.

## Setup

### Full install (recommended)

```bash
git clone git@bitbucket.org:quatico/config.git && cd config
pnpm install && pnpm run install-claude-config
```

Skills are copied to `~/.claude/skills/` which both Claude Code and Cursor read from.

**Note:** Commands are installed as symlinks to the repo, so pulling updates applies them immediately. Skills are copied (not symlinked) for Cursor compatibility—re-run install after pulling to update skills.

## Commands

Reusable slash commands in `commands/`.

**Usage:** `/init-agent`

| Command | Description |
|---------|-------------|
| `init-agent` | Systematic CLAUDE.md creation through project exploration, ecosystem discovery, and rule synthesis |
| `consolidate-agent-rules` | Transform verbose agent rules into AGENTS.md hub-and-spoke pattern with 3 verification loops |
| `bye` | Session wrap-up: document accomplishments, handle git commits, summarize next steps |

**Tips for `consolidate-agent-rules`:**

- Use when CLAUDE.md is too long (>200 lines) or rules get ignored in agent sessions
- Implements hub-and-spoke pattern: minimal AGENTS.md (50-80 lines) + detailed docs/rules/*.md
- Runs 3 verification loops: (1) completeness (100% rule coverage), (2) consistency (0 contradictions), (3) format validation
- Critical rules moved to top of AGENTS.md with numbered, bold formatting (NEVER/MUST/ALWAYS keywords)
- Example-driven spokes with ✅/❌ patterns for visual learning
- Generates timestamped proposal directory—review before applying to project
- Based on successful real-world pattern from internal-project-stable

## Skills

Reusable skills in `skills/`.

| Skill | Description | Token Cost |
|-------|-------------|------------|
| `commit-notation` | Quatico's commit notation (Arlo's v1 + extensions) for structured commit messages | ~500 |
| `commit` | When and what to commit: timing, atomic commits, git hooks, skip policies | ~600 |
| `double-loop-bdd-tdd` | Outside-in development with nested BDD/TDD loops for user stories and integration work | ~1,000 |
| `test-driven-development` | TDD workflow: Red-Green-Refactor, Iron Laws, rationalizations, anti-patterns | ~1,200 |
| `writing-bdd-scenarios` | Gherkin feature files: structure, Given-When-Then, business language, data tables, tags | ~600 |
| `implementing-bdd-scenarios` | Step definitions, Page Objects, async handling, selectors, waiting strategies | ~900 |
| `jest-testing-conventions` | Jest unit testing: jest.fn/spyOn/mock, clear/reset/restore, AAA pattern, fake timers | ~900 |
| `handling-pull-requests` | PR workflow guidance: creating PRs, addressing review feedback, reply conventions | ~700 |
| `working-with-bitbucket-web` | Bitbucket web UI navigation (elements, rich text editor, comment threads) | ~800 |
| `working-with-jira-web` | JIRA web UI navigation (create issues, fill forms, link tickets, wiki markup) | ~700 |
| `writing-clearly-and-concisely` | Strunk's *Elements of Style* (1918) for clear prose—docs, commits, error messages, UI text | ~12,000 (full reference) |
| `agents-md-maintenance` | Maintain AGENTS.md hub-and-spoke integrity: detect drift, broken references, duplicates | ~650 |
| `quatico-sso-auth` | Handles SSO authentication for internal tools (Keycloak + Google SSO) | ~600 |

**Example prompts:**

- `help me write a commit message for these changes`
- `rewrite @README.md using elements-of-style`

**Tips for `commit-notation`:**

- Triggers automatically when discussing commits or referenced by other skills
- Other workflow skills (fix-a-bug, add-feature) can reference this skill
- Source: [quatico-solutions/QuaticoCommitNotation](https://github.com/quatico-solutions/QuaticoCommitNotation)

**Tips for `commit`:**

- Covers WHEN to commit (work done + verified) and WHAT belongs together
- Use with `commit-notation` for complete guidance (this = timing/composition, that = message format)
- Git hooks: never skip with `--no-verify` without asking the human first
- Key insight: commits are checkpoints of verified work, not save points

**Tips for `double-loop-bdd-tdd`:**

- Use for user stories with acceptance criteria, features spanning multiple components
- Outer BDD loop stays RED while inner TDD loops drive implementation
- References sub-skills: `writing-bdd-scenarios`, `implementing-bdd-scenarios`, `test-driven-development`
- Integrates with `commit-notation` for commits after completing work

**Tips for `test-driven-development`:**

- Inner loop of double-loop-bdd-tdd—use for unit-level Red-Green-Refactor
- Key insight: test that passes on first run is wrong (revert and rewrite)
- References `jest-testing-conventions` for Jest-specific mocking patterns
- See `testing-anti-patterns.md` for common pitfalls when mocking

**Tips for `writing-bdd-scenarios`:**

- Write scenarios in business language—describe WHAT users do, not HOW the system works
- Define domain glossary first—ubiquitous language ensures consistency across team
- One scenario per behavior, scenarios must be independent (no shared state)
- Use `@only` during development, remove before committing

**Tips for `implementing-bdd-scenarios`:**

- Steps MUST be reusable—design every step for reuse across scenarios
- Steps are glue code—keep them thin, put logic in Page Objects
- Selector priority: data-testid > role + name > text content > CSS
- See PITFALLS.md for Shadow DOM, timeout, and flaky test debugging

**Tips for `jest-testing-conventions`:**

- Master three functions: `jest.fn()`, `jest.spyOn()`, `jest.mock()`
- Use naming conventions: `testObj`, `target*`, `mock*`, `actual`, `expected`
- Configure `clearMocks: true`, `resetMocks: true`, `restoreMocks: true` in jest.config

**Tips for `handling-pull-requests`:**

- Platform-agnostic workflow; references `working-with-bitbucket-web` for UI navigation
- When posting AI-generated comments, always sign with `🤖 – Claude`
- Address all review feedback before replying—don't fix piecemeal

**Tips for `working-with-bitbucket-web`:**

- Requires native browser tools (Claude in Chrome / Cursor Browser) for SSO authentication
- Never use WebFetch, WebSearch, or MCP browser tools—they can't authenticate
- Rich text editor supports partial markdown: `-` and `##` shortcuts work on paste/first line
- For workflow guidance (when to reply vs resolve), see `handling-pull-requests`

**Tips for `working-with-jira-web`:**

- Requires native browser tools (Claude in Chrome / Cursor Browser) for SSO authentication
- Never use WebFetch, WebSearch, or MCP browser tools—they can't authenticate
- Use wiki markup in descriptions for predictable formatting with browser automation
- Create button is below the fold in dialogs—always scroll down to find it
- Escape key closes entire dialog, not just dropdowns—click outside instead

**Tips for `writing-clearly-and-concisely`:**

- Use when writing prose for humans (docs, commits, error messages, UI text)
- For limited context: dispatch a subagent with your draft + the reference file for copyediting
- Source: [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style) (Public Domain)

**Tips for `agents-md-maintenance`:**

- Use after editing AGENTS.md or any docs/rules/ files to verify sync
- Runs 5 checks: navigation map, critical rule uniqueness, cross-references, example formatting, file sizes
- Auto-fixes safe issues (orphaned spokes, duplicate rules, missing ✅/❌ markers)
- Recommends human judgment for complex issues (splitting large files, merging small ones)
- Include in PR checklist before merging AGENTS.md changes
- Companion to `consolidate-agent-rules` command (that creates, this maintains)

**Tips for `quatico-sso-auth`:**

- Use native browser tools (Claude in Chrome / Cursor Browser) for SSO
- Handles both Keycloak (`*.example.invalid`) and generic Google SSO (Atlassian, Miro, Figma)
- If no Google session exists, ask user to log in manually—never request credentials

## Creating Skills

Skills teach Claude specialized tasks. [Official docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for full details.

### Quick Start

```
my-skill/
├── SKILL.md          # Required: frontmatter + instructions
├── README.md         # Required: development notes, design decisions, testing history
└── REFERENCE.md      # Optional: detailed reference material (>100 lines)
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
