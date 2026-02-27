---
name: working-with-bitbucket-api
description: >-
  Bitbucket Cloud API via `bb` CLI. Primary for PR operations (list, view,
  create, comment, approve, merge). Fallback: browser for rich-text editing.
  Triggers: bitbucket, bitbucket API, bb, PR list, PR comments, create PR,
  merge PR, approve PR, bitbucket repo.
compatibility: claude-code
license: MIT
metadata:
  version: "0.1"
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

**Minimum for full use (recommended):** All four scopes above.

> **Common failure mode:** A token with only read scopes will list and view PRs successfully but fail with HTTP 400 or 401 on any write operation (commenting, approving, merging). Bitbucket error messages do not mention the missing scope — they just say "Bad Request" or "Token is not supported for this endpoint."

> **App Passwords are deprecated.** New creation was disabled Sep 2025; all existing app passwords stop working Jun 2026. Use API Tokens instead.

---

## Command Reference

### `bb auth login [--email <email>]`
Log in with an Atlassian API token. Interactive mode prompts for email and token; non-interactive reads token from stdin (requires `--email`).

### `bb auth status`
Show authenticated user.

### `bb pr list [--state open|merged|declined] [--author user] [--json]`
List pull requests. Defaults to open PRs in the current repo.

```bash
bb pr list
bb pr list --state merged
bb pr list --json
```

### `bb pr view <id> [--comments] [--json]`
View PR details. Add `--comments` to include all comments.

```bash
bb pr view 42
bb pr view 42 --comments
bb pr view 42 --json
```

### `bb pr create --title "..." [--body "..."] [--head branch] [--base branch] [--reviewer user] [--close-branch] [--json]`
Create a pull request. Auto-detects `--head` from current branch and defaults `--base` to `main`.

```bash
bb pr create --title "Add auth module" --body "## Summary\nNew OAuth flow" --reviewer alice
bb pr create --title "Fix typo" --head fix/typo --base develop
```

### `bb pr edit <id> [--title "..."] [--body "..."] [--add-reviewer user] [--remove-reviewer user] [--json]`
Edit a pull request. Add/remove reviewers, update title or description. Reviewer accepts display name, UUID, or account_id.

```bash
bb pr edit 42 --add-reviewer "Egemen Kaba"
bb pr edit 42 --remove-reviewer "Max Albrecht" --add-reviewer "a colleague Tremp"
bb pr edit 42 --title "New title"
```

### `bb pr tasks <id> [--resolve <task_id>] [--reopen <task_id>] [--json]`
List tasks on a PR. Use `--resolve` or `--reopen` to change task state.

```bash
bb pr tasks 42
bb pr tasks 42 --resolve 12345
bb pr tasks 42 --reopen 12345
```

### `bb pr comment <id> --body "..." [--file path] [--line num] [--resolve <comment_id>] [--unresolve <comment_id>] [--json]`
Add a comment, or resolve/unresolve an existing inline comment. Use `--file` and `--line` for inline comments on specific code.

```bash
bb pr comment 42 --body "Looks good! 🤖 – Qubert"
bb pr comment 42 --body "This needs a null check" --file src/auth.ts --line 15
bb pr comment 42 --resolve 12345
bb pr comment 42 --unresolve 12345
```

### `bb pr review <id> --approve [--comment "..."] [--json]`
Approve a PR, optionally with a comment.

```bash
bb pr review 42 --approve
bb pr review 42 --approve --comment "LGTM 🤖 – Qubert"
```

### `bb pr merge <id> [--squash|--merge] [--delete-branch] [--json]`
Merge a PR. Defaults to merge commit strategy.

```bash
bb pr merge 42
bb pr merge 42 --squash --delete-branch
```

### `bb pr close <id> [--json]`
Decline/close a PR.

---

## Auto-detection

`bb` infers workspace and repo from `git remote get-url origin`:
- SSH: `git@bitbucket.org:workspace/repo.git`
- HTTPS: `https://bitbucket.org/workspace/repo.git`

Override with `-R workspace/repo`:

```bash
bb -R quatico/ewz-portal pr list
```

---

## Output Modes

- **Default**: human-readable tables and summaries (for terminal use)
- **`--json`**: raw JSON from the Bitbucket API (for machine consumption / piping to jq)

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
