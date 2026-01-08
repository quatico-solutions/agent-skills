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
| `writing-clearly-and-concisely` | Strunk's *Elements of Style* (1918) for clear prose—docs, commits, error messages, UI text | ~12,000 (full reference) |

**Example prompt:** `rewrite @README.md using elements-of-style`

**Tips for `writing-clearly-and-concisely`:**
- Use when writing prose for humans (docs, commits, error messages, UI text)
- For limited context: dispatch a subagent with your draft + the reference file for copyediting
- Source: [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style) (Public Domain)
