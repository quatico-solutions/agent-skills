# writing-clearly-and-concisely

Development notes for the clear writing skill.

## Reference Documentation

| Resource | URL |
|----------|-----|
| Project Gutenberg Source | https://www.gutenberg.org/files/37134/37134-h/37134-h.htm |
| Original Repo | https://github.com/obra/the-elements-of-style |

## Key Design Decisions

### Source Material
Based on William Strunk Jr.'s *The Elements of Style* (1918), in the public domain.

The reference contains:
1. **Elementary Rules of Usage** - Seven fundamental grammar and punctuation rules
2. **Elementary Principles of Composition** - Eleven rules for clear, effective writing
3. **Words and Expressions Commonly Misused** - An alphabetical guide to usage pitfalls

### Token Cost Warning
The full reference is ~12,000 tokens. The skill warns about this before loading and suggests dispatching a subagent for copyediting when context is limited.

### Trigger Conditions
Only loads the full reference when actively writing or editing prose. Lists all rules at a glance first to allow selective reading.

## License

Public Domain - Original 1918 edition by William Strunk Jr.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial skill from obra/the-elements-of-style |
