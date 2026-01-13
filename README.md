# Claude Code & Cursor Configuration

Shared commands and skills for AI-assisted development with Claude Code and Cursor.

## Setup

Install commands and skills (creates symlinks in `~/.claude/`):
```bash
pnpm run install-claude-config
```

## Commands

Reusable slash commands in `commands/`.

**Usage:** `/qs:init-agent` (Claude Code) or `/qs/init-agent` (Cursor)

| Command | Description |
|---------|-------------|
| `init-agent` | Systematic CLAUDE.md creation through project exploration, ecosystem discovery, and rule synthesis |
| `bye` | Session wrap-up: document accomplishments, handle git commits, summarize next steps |

## Skills

Reusable skills in `skills/`.

| Skill | Description | Token Cost |
|-------|-------------|------------|
| `commit-notation` | Quatico's commit notation (Arlo's v1 + extensions) for structured commit messages | ~500 |
| `writing-clearly-and-concisely` | Strunk's *Elements of Style* (1918) for clear prose—docs, commits, error messages, UI text | ~12,000 (full reference) |

**Example prompts:**
- `help me write a commit message for these changes`
- `rewrite @README.md using elements-of-style`

**Tips for `commit-notation`:**
- Triggers automatically when discussing commits or referenced by other skills
- Other workflow skills (fix-a-bug, add-feature) can reference this skill
- Source: [quatico-solutions/QuaticoCommitNotation](https://github.com/quatico-solutions/QuaticoCommitNotation)

**Tips for `writing-clearly-and-concisely`:**
- Use when writing prose for humans (docs, commits, error messages, UI text)
- For limited context: dispatch a subagent with your draft + the reference file for copyediting
- Source: [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style) (Public Domain)

## Creating Skills

Skills teach Claude specialized tasks. [Official docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for full details.

### Quick Start

```
my-skill/
├── SKILL.md          # Required: frontmatter + instructions
└── REFERENCE.md      # Optional: detailed reference material
```

### SKILL.md Template

```yaml
---
name: my-skill-name     # lowercase, hyphens, max 64 chars
description: What it does and when to use it (max 1024 chars)
---

# My Skill Name

[Instructions here—keep under 500 lines]

See [REFERENCE.md](REFERENCE.md) for details.
```

### Key Principles

1. **Be concise** - Only add what Claude doesn't already know
2. **Progressive disclosure** - Overview in SKILL.md, details in referenced files
3. **Third person** - "Processes files" not "I help you process files"
4. **One level deep** - Reference files directly from SKILL.md, avoid nesting
5. **Test across models** - Haiku may need more guidance than Opus

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

- [Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Anthropic Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

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
