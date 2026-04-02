---
name: working-with-bitbucket-api
description: "Bitbucket Cloud API via `bb` CLI. Handles all PR operations (list, view, create, edit, comment, approve, merge) and source browsing (ls, cat, branch, tag) including markdown descriptions. Browser only for image uploads. Triggers: bitbucket, bitbucket API, bb, PR list, PR view, PR comments, create PR, make PR, open PR, new PR, draft PR, merge PR, approve PR, close PR, decline PR, PR review, PR feedback, push and PR, bitbucket repo, bitbucket remote, source browse, list branches, list tags, file contents, browse repo."
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.1.0"
---

# Working with Bitbucket API

Bitbucket Cloud operations via the `bb` CLI wrapper (REST API v2, `gh`-style UX).

> **macOS tested, POSIX portable.** `bb auth login` uses macOS Keychain (`security`) and `open` — these won't work on Linux. All other commands work on any POSIX system with `curl` and `jq` if you set `BB_TOKEN` and `BB_EMAIL` env vars.

> **Remote detection:** If `git remote get-url origin` contains `bitbucket.org`, this is a Bitbucket repository — use `bb` CLI for all PR and source operations.

---

## Prerequisites

Before using any `bb` command, verify it is installed **and working**:

```bash
bb --version 2>/dev/null
```

**If `bb` works:** Continue.

**If `bb` is not found or fails** (e.g., stale symlink after plugin upgrade): Run `install-dependencies.sh` from this skill directory to install/repair it — no user approval needed, this is safe and idempotent:

```bash
bash "{{SKILL_DIR}}/install-dependencies.sh"
```

Then verify with `bb auth status`. If not logged in, tell the user to run `bb auth login`.

Do NOT silently fall back to `curl` or browser automation.

> **Exception:** If the user explicitly prefers browser automation, or if the project's CLAUDE.md says to use `working-with-bitbucket-web`, honor that preference.

---

## Tool Selection Decision Tree

```
Need to interact with Bitbucket?
├── List/view PRs? → bb pr list / bb pr view
├── Read PR comments? → bb pr view <id> --comments
├── Post comment? → bb pr comment
├── Create PR? → bb pr create
├── Edit PR (reviewers, title, description, target branch)? → bb pr edit
├── Mark draft PR as ready? → bb pr edit <id> --ready
├── Approve PR? → bb pr review --approve
├── Merge PR? → bb pr merge
├── Close/decline PR? → bb pr close
├── List/resolve tasks? → bb pr tasks
├── Raw API call? → bb api <path>
├── Upload images to PR? → Browser (working-with-bitbucket-web)
└── SSO-gated page? → Browser (last resort)
```

`bb` handles everything including markdown in `--body` (descriptions, comments).
Browser is a **last resort** — only for image uploads and SSO-gated pages.

> **Markdown**: Bitbucket uses CommonMark, not GFM — no task lists, no strikethrough, no bare autolinks. Use the `markdown` skill if installed.

---

## Authentication

Log in with an Atlassian API token:

```bash
bb auth login
```

Non-interactive (Claude Code / CI):
```bash
echo "$TOKEN" | bb auth login --email user@example.com
```

Verify with `bb auth status`. Override with env vars: `BB_TOKEN`, `BB_EMAIL`.

### Required API Token Scopes

Create an API token at https://id.atlassian.com/manage-profile/security/api-tokens with these scopes:

| Scope | Required For |
|-------|-------------|
| **read:user:bitbucket** | `bb auth status` |
| **read:repository:bitbucket** | `bb pr list`, `bb pr view`, `bb source ls/cat` |
| **read:pullrequest:bitbucket** | `bb pr list`, `bb pr view --comments` |
| **write:pullrequest:bitbucket** | `bb pr create`, `bb pr edit`, `bb pr comment`, `bb pr review`, `bb pr merge`, `bb pr close`, `bb pr tasks --resolve/--reopen` |
| **write:repository:bitbucket** | `bb source ls/cat/branch/tag` (private repos) |

**Minimum for full use (recommended):** All five scopes above. Scope-to-command mappings are approximate — Bitbucket may require additional scopes depending on repository permissions.

> **Common failure mode:** A token with only read scopes will list and view PRs successfully but fail with HTTP 400 or 401 on any write operation (commenting, approving, merging). Bitbucket error messages do not mention the missing scope — they just say "Bad Request" or "Token is not supported for this endpoint."

> **App Passwords are deprecated.** New creation was disabled Sep 2025; all existing app passwords stop working Jun 2026. Use API Tokens instead.

---

## Command Reference

Run `bb --help` for the full command list, or `bb <command> <subcommand> --help` for flags, defaults, and examples.

---

## Raw API Access

For API endpoints not yet wrapped by `bb` commands, use `bb api` as an escape hatch:

```bash
bb api /repositories/{ws}/{repo}                        # GET (default)
bb api /repositories/{ws}/{repo}/pullrequests/42/decline --method POST
bb api /repositories/{ws}/{repo}/pullrequests --method POST --data '{"title":"test"}'
```

`{ws}` and `{repo}` are auto-replaced with the current repo's workspace and slug.

---

## Fallback: Browser Automation

Use `working-with-bitbucket-web` skill only when:
- Uploading images to PRs (no API support)
- SSO-gated pages that require browser authentication

---

## Integration

| Skill | Use For |
|-------|---------|
| `handling-pull-requests` | PR workflow (when to create, how to handle feedback) |
| `working-with-bitbucket-web` | Browser fallback (image uploads, SSO pages) |
| `commit-notation` | Commit messages |
