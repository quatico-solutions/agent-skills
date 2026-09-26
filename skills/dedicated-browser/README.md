# dedicated-browser

Development notes. What the skill does and how to use it is in [SKILL.md](SKILL.md).

## What it is for

A developer at their own Mac wants the agent to use a browser. The agent gets a **separate**
browser with its own saved logins. The human signs in only to the systems the agent should reach.
The agent never gets the human's everyday browser, which has access to everything.

Chrome for Testing (CfT) is the browser because it is a different app: its own bundle, its own
Dock icon, its own Cmd-Tab entry. That makes it easy to tell apart from the human's Chrome. A
separate profile is also a platform rule, not only a preference: since Chrome 136 the debugging
port is refused on the default profile (CfT is exempt, but we use our own profile regardless).

## Layout

```
SKILL.md                    agent-facing instructions
README.md                   this file
scripts/dedicated-browser   the CLI: setup | start | stop | status | update   (bash 3.2)
scripts/backend-chrome.sh   everything Chrome-specific, sourced by the CLI
tests/smoke.sh              end-to-end test on a real Mac (manual)
tests/cookie.mjs            helper for smoke.sh: plant / read a cookie over the debugging port
```

Two settings, both environment variables: `DEDICATED_BROWSER_PORT` (default **9393**) and
`DEDICATED_BROWSER_HOME` (default `~/Library/Application Support/dedicated-browser`, holding the
browser app and `profile/`). Removing that directory uninstalls everything. 9393 is not 9222,
because 9222 is the port every tool reaches for first and is often already taken.

## How it works

`setup` downloads CfT from Google's public storage (the version comes from the "last known good
versions" JSON), unpacks it with `ditto`, clears the quarantine flag and starts it with
`--remote-debugging-port` and `--user-data-dir`. The agent attaches through
[Playwright MCP](https://github.com/microsoft/playwright-mcp) with `--cdp-endpoint`, registered
under the server name `dedicated-browser`.

Why CDP and not letting Playwright MCP launch the browser (`--executable-path` +
`--user-data-dir`), or its `--extension` mode:

- the browser outlives agent sessions, so the human can open it and sign in with no agent running;
- several sessions can share it (Playwright's own persistent profile refuses a second session
  with "Browser is already in use");
- a browser we launch has none of a test runner's launch flags. Measured on the smoke-test
  browser: `navigator.webdriver` is `false`;
- extension mode drives a running Chrome through an extension, which is closer to the human's own
  browser than this skill wants.

Why the MCP server is named `dedicated-browser` and not `playwright`: the tools then read
`mcp__dedicated-browser__browser_*`, which names the right browser at a glance, and it avoids the
name clash with the official `playwright` plugin. That plugin registers the same name without
`--cdp-endpoint` and starts its own Chromium, so the agent silently works in a browser without the
logins.

## Decisions

**Behind stable: warn only.** CfT does not update itself, and an old build can be refused by some
login pages. `start` and `status` compare the installed major version with the *published* CfT
stable version (looked up at most once a day, cached in `$DEDICATED_BROWSER_HOME/.latest-stable`)
and print a `note:`. Nothing downloads without being asked. The alternative, updating inside
`start` when the browser is stopped, was rejected: the failure it prevents has been seen once in
many months across several machines, and a download nobody asked for is a worse surprise. There
is deliberately no fallback to an installed Chrome stable: it would put the agent in a browser
that looks like the human's, which is the thing this skill exists to prevent. The comparison is
against the published channel, not against a locally installed Chrome, because an adopter may not
have one.

**Real macOS keychain.** No `--password-store=basic` or `--use-mock-keychain`. Cookies are
encrypted at rest with a key in the keychain, at the cost of one "Always Allow" prompt on first
run. Consequences worth knowing:

- Until that prompt is answered, cookie access blocks. Playwright calls hang. SKILL.md tells the
  agent what this means.
- The choice is permanent for a profile. Saved logins are sealed against the password store in
  effect, so switching later looks like lost logins. The flags therefore never change between
  launches.

**Another browser on the port is not ours.** `status` and `start` check that the process answering
the port is the one started for this profile (its argv holds both the profile path and the port).
Otherwise a Chrome the human started with debugging on could answer, and the agent would drive
their everyday logins. `status` exits 2 in that case. The smoke test covers it.

**No stop by app name.** `stop` finds the main process by profile path (helper processes carry
`--type=` and are skipped) and sends SIGTERM, so another Chrome for Testing on the machine is
never touched and the browser quits normally, which is what writes the logins to disk.

## Kept from chrome-browser, and cut

This skill is a rewrite for a different reader (a person at their own Mac), not an edit of the
author's `chrome-browser` skill, which keeps serving remote and headless hosts.

| Kept | Why |
|---|---|
| Chrome for Testing, a separate profile, headed | the point of the skill |
| `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`, `--disable-background-timer-throttling` | A window covered by the editor is macOS's "occluded". Chrome then stops drawing frames and every Playwright click times out on "visible, enabled and stable". |
| `--no-first-run`, `--no-default-browser-check`, `--disable-search-engine-choice-screen`, `--disable-infobars` | no dialogs in the agent's way |
| exit codes 0/1/2 for health; no python anywhere in the scripts | a version-manager `python3` shim exists on `PATH` yet fails; `sed` and `defaults` cannot |
| page gotchas, "never drive the debugging port by hand", "do not switch to a lookalike MCP" | mistakes agents kept making |

| Cut | Why |
|---|---|
| LaunchAgent, `restart` through launchctl, log files in `/tmp` | start at login and remote use are out of scope. `stop` + `start` restarts it. |
| Fallback to Chrome stable, `CHROME_CDP_PREFER` | replaced by the warning above |
| `--password-store=basic --use-mock-keychain` | a server convenience: it avoids the prompt by giving up protection at rest |
| server-quieting flags (background networking, component update, sync, metrics, phishing detection, crash reporter, popup blocking, hang monitor, most `--disable-features`) | they suit unattended machines. On a person's Mac they only make the browser less like a normal one. `--disable-features=Translate` stays. |
| symlinks into `~/.local/bin` | plugin cache paths are versioned and change on update, so the links go stale. SKILL.md calls the script by `${CLAUDE_SKILL_DIR}`. |
| `@puppeteer/browsers` through `npx` | a plain download from the public CfT storage needs no Node for the browser itself |
| separate health, tabs and restart scripts | folded into `status`, `stop` and `start` |
| named-site rate-limit numbers | a generic "1 to 2 seconds between pages" instead |

## Adding a backend (Safari is the first candidate)

Not implemented. The seam is `backend-<name>.sh`, selected with `DEDICATED_BROWSER_BACKEND`
(default `chrome`). The CLI contains no browser-specific code. A backend defines:

| Function | Answers |
|---|---|
| `backend_app_label` | the name to show in messages |
| `backend_installed_version` | installed version, empty if none |
| `backend_latest_version` | what the vendor ships as stable; non-zero if unknown |
| `backend_install [VERSION]` | install into `$DB_HOME`, replacing an older copy |
| `backend_launch` | start it detached, with `$DB_PROFILE` and `$DB_PORT` |
| `backend_main_pids [PORT]` | the main process of *this profile*, optionally only if it owns PORT |

The CLI's own `status` also reads `/json/version` from the debugging port. **A Safari backend
changes more than a file.** Safari does not speak the Chrome debugging protocol, and Playwright's
`webkit` is a WebKit build, not Safari. So it would also change how the agent connects (the "MCP
server" part of SKILL.md and `setup`'s output), and `status` would need a backend hook instead of
reading the port. Safari Technology Preview is the natural pick for "easy to tell apart", if the
human already uses it. Whether Safari offers its own agent interface is not verified here.

## Considered: Vercel's `agent-browser`

Checked at commit `d01253d` (2026-09-22), and against a running dedicated browser.

- It attaches: `npx agent-browser@0.38.1 --cdp 9444 snapshot` returned a correct accessibility
  snapshot of a page in the dedicated browser. The dedicated browser can be driven by it.
- It is not used as the launcher. When it launches Chrome with `--profile <dir>` it always adds
  `--password-store=basic --use-mock-keychain`; the real keychain is used only for a copy of the
  human's own Chrome profile. It starts the browser on a random port (`--remote-debugging-port=0`)
  owned by its daemon, so the browser is not there for the human to sign in to between agent
  sessions. Its launch flags are the server set cut above.
- Its bundled skill is also named `agent-browser` and tells the agent to prefer it over any other
  browser tool, so both installed together would compete for the same requests.

No user-facing recommendation is made either way yet.

## Deviations from repo conventions

- **No `install-dependencies.sh`.** The repo asks for a macOS + Homebrew script for skills with
  external dependencies. Chrome for Testing has no Homebrew cask, so `setup` downloads it directly.
  Node (for the MCP server, via `npx`) is checked, and `setup` prints `brew install node` if it is
  missing rather than installing it.
- **`${CLAUDE_SKILL_DIR}`** is used for the script path, as in `bye` and `typescript-strict-patterns`.
  The repo also uses `{{SKILL_DIR}}` once, and nothing here says which one Cursor substitutes.

## Testing

`tests/smoke.sh` runs the real scripts against a fresh temp directory on port 9444. It refuses
port 9222 and checks that whoever holds 9222 is unchanged at the end. Unattended it runs a *copy*
of the scripts with two extra flags, `--use-mock-keychain --password-store=basic`, so a keychain
prompt cannot block it. `--real-keychain` runs the scripts as shipped and needs a human to click
Always Allow.

Run on 2026-09-26, macOS 15 on Apple silicon, CfT 154 and 152 (unattended mode):

| Covered | Result |
|---|---|
| `setup`: real download, install, start | pass |
| `status`, second `start` is a no-op, the port answers | pass |
| a cookie survives `stop` and `start` | pass |
| a browser with another profile on the port is refused by `status` (exit 2) and `start` | pass |
| the behind-stable note, and `update` refusing while the browser runs | pass |
| a real update from 152 to 154: the cookie survives, and a second `update` says "already current" | pass |
| port 9222 has the same owner before and after | pass |
| shellcheck clean; `/bin/bash` 3.2 syntax check | pass |
| MCP wiring: `claude -p --strict-mcp-config` with only the `dedicated-browser` server drove the browser to a page; Playwright MCP attached and did not start a second browser | pass, by hand |
| Vercel `agent-browser --cdp` attaches | pass, by hand |

**Not covered, and needs a human at the machine:**

- The real keychain path. A first run without mock flags raised the macOS prompt and blocked all
  cookie access until answered. Whether the prompt comes back after a browser update is unknown:
  the update step above ran with mock flags.
- Intel Macs: the `mac-x64` download URL is built the same way but was not run.
- Cursor: which skill-directory variable it substitutes, and the `mcp.json` snippet.
- `setup` on a machine without Node.
- The `page.close()` note in SKILL.md is carried over from field experience, not re-measured.

## Follow-ups

- Point `working-with-jira-web` and `working-with-bitbucket-web` here for SSO pages, once the
  skill has been used for a while. Not part of this change.
- Decide whether to mention Vercel's `agent-browser` to users, after more testing.
- Usage data from the author's machines was not available when this was written. Fold it in when
  it is.
