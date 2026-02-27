---
name: working-with-bitbucket-api
description: >-
  Bitbucket Cloud API via `bb` CLI. Primary for PR operations (list, view,
  create, comment, approve, merge). Fallback: browser for rich-text editing.
  Triggers: bitbucket, bitbucket API, bb, PR list, PR comments, create PR,
  merge PR, approve PR, bitbucket repo.
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.0.0"
---

# Working with Bitbucket API

Bitbucket Cloud operations via the `bb` CLI wrapper (REST API v2, `gh`-style UX).

> **macOS tested, POSIX portable.** `bb auth login` uses macOS Keychain (`security`) and `open` — these won't work on Linux. All other commands work on any POSIX system with `curl` and `jq` if you set `BB_TOKEN` and `BB_EMAIL` env vars.

---

## Tool Selection Decision Tree

```
Need to interact with Bitbucket?
├── List/view PRs? → bb pr list / bb pr view
├── Read PR comments? → bb pr view <id> --comments
├── Post comment? → bb pr comment
├── Create PR? → bb pr create
├── Edit PR (reviewers, title)? → bb pr edit
├── Approve PR? → bb pr review --approve
├── Merge PR? → bb pr merge
├── Close/decline PR? → bb pr close
├── List/resolve tasks? → bb pr tasks
├── Edit PR description (rich text)? → Browser (working-with-bitbucket-web)
├── Add images to PR? → Browser
└── SSO-gated page? → Browser
```

| Operation | bb CLI | Browser |
|-----------|--------|---------|
| List PRs | `bb pr list` | Slow, fragile |
| View PR details | `bb pr view <id>` | Unnecessary |
| Read comments | `bb pr view <id> --comments` | Unnecessary |
| Post comment | `bb pr comment <id> --body "..."` | Use for rich text only |
| Create PR | `bb pr create --title "..." --body "..."` | Use for rich-text body |
| Edit PR (reviewers, title) | `bb pr edit <id> --add-reviewer ...` | Unnecessary |
| Approve | `bb pr review <id> --approve` | Unnecessary |
| Merge | `bb pr merge <id>` | Unnecessary |
| List/resolve tasks | `bb pr tasks <id>` | Unnecessary |
| Edit description (rich text) | `bb pr edit <id> --body` or Browser | Browser for complex formatting |
| Upload images | — | **Required** |

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
| **read:repository:bitbucket** | `bb pr list`, `bb pr view` |
| **read:pullrequest:bitbucket** | `bb pr list`, `bb pr view --comments` |
| **write:pullrequest:bitbucket** | `bb pr create`, `bb pr edit`, `bb pr comment`, `bb pr review`, `bb pr merge`, `bb pr close`, `bb pr tasks --resolve/--reopen` |

**Minimum for full use (recommended):** All four scopes above. Scope-to-command mappings are approximate — Bitbucket may require additional scopes depending on repository permissions.

> **Common failure mode:** A token with only read scopes will list and view PRs successfully but fail with HTTP 400 or 401 on any write operation (commenting, approving, merging). Bitbucket error messages do not mention the missing scope — they just say "Bad Request" or "Token is not supported for this endpoint."

> **App Passwords are deprecated.** New creation was disabled Sep 2025; all existing app passwords stop working Jun 2026. Use API Tokens instead.

---

## Command Reference

Run `bb --help` for the full command list, or `bb <command> <subcommand> --help` for flags and usage.

**Gotchas not in `--help`:**
- **Reviewer resolution**: `--add-reviewer` / `--reviewer` accepts display name, UUID, or account_id. Display names are resolved by searching existing PR participants — use account_id or UUID for users not yet on any PR.
- **Non-interactive auth**: `echo "$TOKEN" | bb auth login --email user@example.com` (reads token from stdin).
- **Repo auto-detection**: Inferred from `git remote get-url origin`. Override with `-R workspace/repo`.
- **Output modes**: Human-readable by default, `--json` for raw API JSON.

---

## Fallback: Browser Automation

Use `working-with-bitbucket-web` skill when:
- Editing PR descriptions with rich text formatting
- Uploading images to PRs
- Operations not covered by the API
- SSO-gated pages that require browser authentication

---

## Integration

| Skill | Use For |
|-------|---------|
| `handling-pull-requests` | PR workflow (when to create, how to handle feedback) |
| `working-with-bitbucket-web` | Browser fallback for rich-text and image operations |
| `commit-notation` | Commit messages |
