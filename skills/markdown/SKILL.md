---
name: markdown
description: "Use when writing or reviewing any markdown file in this workspace. Quick reference for supported syntax (CommonMark + Bitbucket safe)."
license: MIT
metadata:
  version: "1.0.1"
---

# Markdown

Use only syntax supported by **both CommonMark and Bitbucket**. One canonical form per feature.

## Do Not Use

These are **not CommonMark** and may not render correctly:

- Task lists (`- [ ]`, `- [x]`) — use status markers (✅, 🔄, ⏸️) instead
- Strikethrough (`~~text~~`)
- Bare URL autolinks — always use `[text](url)`

## Quick Reference

### Inline

```markdown
*italic*
**bold**
***bold italic***
`inline code`
[link text](https://example.com)
![alt text](image.png)
```

### Headings

```markdown
# Heading 1

## Heading 2

### Heading 3
```

### Lists

```markdown
- Item one
- Item two
  - Nested item

1. First
2. Second
```

### Blockquotes

```markdown
> Quoted text
>
> Second paragraph in quote
```

### Code Blocks

````markdown
```javascript
const x = 1;
```
````

### Tables

```markdown
| Left | Center | Right |
|------|:------:|------:|
| a    | b      | c     |
```

### Horizontal Rule

```markdown
---
```

### Images with Title

```markdown
![Alt text](image.png "Optional title")
```

## Formatting Rules

- **Blank line** before and after every block element (headings, lists, code blocks, tables, blockquotes)
- **Tables** are technically a GFM extension but supported by Bitbucket and virtually all renderers — safe to use
- **Nested lists**: indent with 2 or 4 spaces
- **Line breaks**: use a blank line between paragraphs (not trailing spaces)
