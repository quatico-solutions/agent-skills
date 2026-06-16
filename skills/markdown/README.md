# markdown

Development notes for the CommonMark syntax reference skill.

## Purpose

Quick-reference for markdown syntax that renders correctly across both CommonMark and Bitbucket. Extracted as a standalone skill so other skills (like `story-tracking`) can reference it rather than duplicating rules.

## Design Decisions

### CommonMark + Bitbucket intersection
Restricts to syntax supported by both renderers. Tables are technically GFM but included because Bitbucket supports them and they are ubiquitous.

### Blocklist over allowlist
The "Do Not Use" section lists prohibited syntax (task lists, strikethrough, bare URLs) rather than exhaustively listing allowed syntax. More memorable and catches the common mistakes.

### Extracted from story-tracking
Originally the markdown rules were inline in `story-tracking`. Extracted as a companion skill because any markdown-writing task benefits from the same rules, not just story documents.

## Related Skills

- `story-tracking` — primary consumer of these rules
