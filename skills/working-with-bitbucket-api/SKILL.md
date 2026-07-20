---
name: working-with-bitbucket-api
description: "Bitbucket Cloud API via `bb` CLI. Handles all PR operations (list, view, create, edit, comment, approve, merge), image uploads (via the Downloads area), and source browsing (ls, cat, branch, tag) including markdown descriptions. Browser only for SSO-gated pages. Triggers: bitbucket, bitbucket API, bb, PR list, PR view, PR comments, create PR, make PR, open PR, new PR, draft PR, merge PR, approve PR, close PR, decline PR, PR review, PR feedback, push and PR, upload image to PR, attach screenshot, bitbucket repo, bitbucket remote, source browse, list branches, list tags, file contents, browse repo."
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.4.1"
---

# Working with Bitbucket API

Bitbucket Cloud operations via the `bb` CLI wrapper (REST API v2, `gh`-style UX).

> **macOS tested, POSIX portable.** `bb auth login` uses macOS Keychain (`security`) and `open` — these won't work on Linux. All other commands work on any POSIX system with `curl` and `jq` if you set `BB_TOKEN` and `BB_EMAIL` env vars.

> **Homebrew is an official dependency of the installer.** `install-dependencies.sh` installs `jq` via brew and copies `bb` into `$(brew --prefix)/bin` (on PATH for every Homebrew user). Non-Homebrew setups: `BB_INSTALL_DIR=<writable-dir-on-your-PATH> ./install-dependencies.sh` — and provide `jq` yourself.

> **Remote detection:** If `git remote get-url origin` contains `bitbucket.org`, this is a Bitbucket repository — use `bb` CLI for all PR and source operations.

---

## Step 0 (gate): confirm `bb` is installed, current, AND this skill's — before any command

Before any `bb` command, check more than "does it run". A `bb` that merely works can be an
**older build** — installed by a previous version of this skill — that silently lacks newer
subcommands or flags. The command then fails in a way that looks like an API or auth problem
when the real fix is a reinstall. Verify the version first:

```bash
bb --version                              # running version (missing counts as outdated)
grep -m1 BB_VERSION "{{SKILL_DIR}}/bin/bb"   # the version THIS skill ships
```

**If `bb` is missing or its version differs from the skill's `BB_VERSION`,** reinstall — no
user approval needed, this is safe and idempotent:

```bash
bash "{{SKILL_DIR}}/install-dependencies.sh"   # copies this skill's bin/bb -> $(brew --prefix)/bin/bb, checks jq
```

Re-run `bb --version` to confirm it matches, then check auth with `bb auth status`. If not
logged in, tell the user to run `bb auth login`.

**Never diagnose a `bb` command or auth error before ruling out a version mismatch** —
reinstall from this skill first. Do NOT silently fall back to `curl` or browser automation.

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
├── Attach an image to a PR comment? → bb pr comment <id> --image <file>
├── Upload a file to the repo? → bb download upload <file>
├── Raw API call? → bb api <path>
└── SSO-gated page? → Browser (last resort)
```

`bb` handles everything including markdown in `--body` (descriptions, comments)
and image uploads (via the repo Downloads area — see below).
Browser is a **last resort** — only for SSO-gated pages.

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

> **This skill is the single source of truth for the `bb` command surface.** Do **not** maintain a local `gh`→`bb` translation/mapping table in a repo's `CLAUDE.md`/`AGENTS.md`. A copied local table duplicates this skill and drifts out of date — that is how stale, incorrect mappings spread (e.g. inventing a non-existent `bb pr ready` instead of `bb pr edit <id> --ready`). When a repo's agent-docs reference a `gh` command, translate it on the fly using this skill and `bb --help`, not from a hand-maintained table.

### Targeting another repository (`-R`)

By default `bb` auto-detects the workspace/repo from the current directory's `origin` remote. To operate on a **different** repo — or from a directory that is not a Bitbucket checkout at all — pass the global `-R workspace/repo` flag **before** the subcommand:

```bash
bb -R quatico/other-repo source ls
bb -R quatico/other-repo source cat README.md --ref develop
bb -R quatico/other-repo pr list
```

`-R` is global, so it works for every command (`source`, `pr`, `api`, …). It must come **before** the subcommand — `bb source cat -R …` will not work. Without `-R`, source browsing and all other operations act on the current repo only.

---

## Raw API Access

For API endpoints not yet wrapped by `bb` commands, use `bb api` as an escape hatch:

```bash
bb api /repositories/{ws}/{repo}                        # GET (default)
bb api /repositories/{ws}/{repo}/pullrequests/42/decline --method POST
bb api /repositories/{ws}/{repo}/pullrequests --method POST --data '{"title":"test"}'
```

`{ws}` and `{repo}` are auto-replaced with the current repo's workspace and slug — or with the repo named by a global `-R workspace/repo` flag (see [Targeting another repository](#targeting-another-repository--r)).

---

## Attaching Images to PRs (no browser)

Images can be attached to PR comments and descriptions **entirely via the API** —
no browser required. Bitbucket's repo **Downloads** area accepts multipart file
uploads; you then reference the resulting URL with CommonMark image syntax.

**One step (recommended)** — `bb pr comment --image` uploads and references the image for you:

```bash
bb pr comment 42 --image before-after.png --body "Layout regression below:"
```

Repeat `--image` for multiple images. Each is uploaded under a `pr<id>-` prefixed
name (avoids cross-PR collisions) and appended to the body as `![name](url)`.

**Two steps** — upload, then reference the URL yourself (e.g. in a PR description):

```bash
url="$(bb download upload pr42-diff.png)"     # prints the download URL
bb pr edit 42 --body "## Screenshots

![diff]($url)"
```

`bb download list` shows what's currently in the Downloads area.

### Caveats

- The download URL is **private** — it returns `401` to unauthenticated requests
  but renders inline for reviewers viewing the PR in an authenticated browser.
  This is expected and fine.
- Downloads are **repo-global** (not scoped to a PR) and **collide by name** — a
  re-upload with the same name overwrites the previous file. Use unique, prefixed
  names (the `--image` flow does this automatically).
- `bb api` can't do uploads: it only sends JSON bodies. Use `bb download upload` /
  `bb pr comment --image`, which send `multipart/form-data`.

---

## Fallback: Browser Automation

Use `working-with-bitbucket-web` skill only when:
- SSO-gated pages that require browser authentication

Image uploads no longer need a browser — use `bb pr comment --image` or
`bb download upload` (see above).

---

## Integration

| Skill | Use For |
|-------|---------|
| `handling-pull-requests` | PR workflow (when to create, how to handle feedback) |
| `working-with-bitbucket-web` | Browser fallback (SSO-gated pages only) |
| `commit-notation` | Commit messages |
