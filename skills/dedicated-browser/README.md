# dedicated-browser

**Beta (0.1.0).** Feedback welcome: open an issue at https://github.com/quatico-solutions/agent-skills/issues.

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
tests/vm-smoke.sh           runs smoke.sh in a throwaway macOS VM (tart, Apple silicon)
tests/cookie.mjs            helper for smoke.sh: plant / read a cookie over the debugging port
tests/interact.mjs          helper for smoke.sh: drive a local web app with Playwright over the port
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

**No stop by app name.** `stop` finds the main process by profile path (helper processes carry `--type=` and are skipped), so another Chrome for Testing on the machine is never touched.

**`stop` quits through the port, not by signal.** When the process listening on the port is this profile's browser (checked with `lsof`), `stop` opens `chrome://quit` through the port's HTTP endpoint. That runs the Quit menu's shutdown, which writes cookies to disk. SIGTERM is only the fallback: Chrome writes new cookies on a 30-second timer, and on SIGTERM it lost a cookie set just before the stop in 15 of 17 runs on a clean VM. `chrome://quit` kept it in 6 of 6.

## Kept from chrome-browser, and cut

This skill is a rewrite for a different reader (a person at their own Mac), not an edit of the
author's `chrome-browser` skill, which keeps serving remote and headless hosts.

| Kept | Why |
|---|---|
| Chrome for Testing, a separate profile, headed | the point of the skill |
| `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`, `--disable-background-timer-throttling` | A window covered by the editor is macOS's "occluded". Chrome then stops drawing frames and every Playwright click times out on "visible, enabled and stable". |
| `--no-first-run`, `--no-default-browser-check`, `--disable-search-engine-choice-screen`, `--disable-infobars` | no dialogs in the agent's way |
| `--disable-popup-blocking`, `--disable-hang-monitor` | sign-in pop-ups that a page opens from script still work; no "Page unresponsive" dialog in the agent's way |
| `--disable-breakpad`, `--disable-component-update`, `--disable-sync`, `--metrics-recording-only` | background work a person never sees; component updates are already off in Chrome for Testing |
| `--disable-features=` `Translate`, `MediaRouter`, `DialMediaRouteProvider`, `OptimizationHints`, `AutofillServerCommunication` | no translate bubble, no Cast discovery on the local network, fewer requests to Google |
| exit codes 0/1/2 for health; no python anywhere in the scripts | a version-manager `python3` shim exists on `PATH` yet fails; `sed` and `defaults` cannot |
| page gotchas, "never drive the debugging port by hand", "do not switch to a lookalike MCP" | mistakes agents kept making |

| Added | Why |
|---|---|
| `--disable-features=AimEnabled` | no AI Mode button in the address bar; replaces `AiModeOmniboxEntryPoint` and `OmniboxAiModeEntryPointVariations`, which Chrome 154 no longer has |
| `--disable-features=LensOverlay` | no Google Lens overlay or "Search with Lens" entry points |
| `--disable-features=FedCm` | no browser "Sign in to <site> with <provider>" dialog; a "Sign in with Google" button may then do nothing. A control run on CfT 154 showed `IdentityCredential` present by default and gone with this flag. |
| `--allow-browser-signin=false` | no "Sign in to Chrome as …" bubble after a Google login and no sync promos; signing in to Google websites still works. Chrome for Testing ships Google's sign-in credentials, so this sign-in is on by default. |
| profile setting `profile.password_manager_leak_detection = false`, written before each start | no "password found in a data breach" warnings; replaces `PasswordCheck`. Saving passwords still works. No flag controls this in Chrome 154. |

| Cut | Why |
|---|---|
| LaunchAgent, `restart` through launchctl, log files in `/tmp` | start at login and remote use are out of scope. `stop` + `start` restarts it. |
| Fallback to Chrome stable, `CHROME_CDP_PREFER` | replaced by the warning above |
| `--password-store=basic --use-mock-keychain` | the mock keychain encrypts the profile's cookies (the logins) with a fixed key that Chromium publishes. `--password-store` only matters on Linux. |
| `--disable-prompt-on-repost` | a reload of a page that came from a form would re-send the form without asking (Chromium's `NavigationControllerImpl::Reload`) |
| `--disable-background-networking`, `--disable-client-side-phishing-detection` | Safe Browsing stays current while the profile holds live logins and the agent visits any site |
| `--disable-features=` `TranslateUI`, `PasswordCheck`, `PasswordManagerOnboarding`, `TabOrganization`, `AiModeOmniboxEntryPoint`, `OmniboxAiModeEntryPointVariations`, `GlobalMediaControls` | none of these names exists in Chrome for Testing 154 (checked in the source at the 154 tag and in the binary), so Chrome ignores them. Replacements are in "Added"; tab organization is gone from Chrome. |
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
| `backend_quit` | quit it through `$DB_PORT` the way its Quit menu does, so logins reach disk |
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

`tests/smoke.sh` runs the real scripts against a fresh temp directory on port 9444. It refuses port 9222 and checks that whoever holds 9222 is unchanged at the end. Unattended it runs a *copy* of the scripts with two extra flags, `--use-mock-keychain --password-store=basic`, so a keychain prompt cannot block it. `--real-keychain` runs the scripts as shipped; a human must click Always Allow whenever macOS asks.

Step 3 drives the browser the way the agent's MCP server does: `tests/interact.mjs` attaches Playwright (`playwright-core`, installed into the temp directory) over the debugging port and uses the profile's default context. It serves a small web app on 127.0.0.1, types a user name into its form and clicks Sign in; the server answers with a real `Set-Cookie`. It clicks a page-script button three times, writes localStorage and loads example.com. After `stop` and `start` it checks that the server still sees the session cookie and that localStorage is still there. Both phases save a screenshot, to `SMOKE_ARTIFACTS` when that is set.

`tests/vm-smoke.sh` runs `smoke.sh` in a throwaway macOS VM with [tart](https://tart.run) on an Apple silicon Mac, so the host's browsers and keychain cannot change the result. It passes its options on to `smoke.sh` and copies the screenshots out of the VM. `--real-keychain --quick` runs unattended there, because a fresh keychain shows no prompt on the first start. Without `--quick`, step 6 waits for the prompt that every update brings, and nobody is there to click it.

Run on 2026-10-02 with `vm-smoke.sh`, in a clean macOS 26.5 VM, CfT 154 and 152, playwright-core 1.63.0, with the flag set above: 46 of 46 checks pass with the mock keychain. `--real-keychain --quick` passed 33 of 33 in the VM before the flag changes, and 36 of 36 on a Mac after them.

| Covered | Mock keychain | Real keychain |
|---|---|---|
| `setup`: real download, install, start; `status`; a second `start` is a no-op | pass | pass |
| a cookie set just before `stop` survives `stop` and `start` | pass | pass |
| the profile records Chrome's own sign-in as off (`signin.allowed`) and the breach check as off | pass | pass |
| Playwright over the debugging port: typing, clicks and a page script work; a server-set cookie and localStorage survive `stop` and `start`; example.com loads with FedCM's `IdentityCredential` absent; the browser keeps running after Playwright disconnects | pass | pass |
| a browser with another profile on the port: `status` exits 2, `start` refuses, `stop` leaves it running | pass | pass |
| the behind-stable note, and `update` refusing while the browser runs | pass | pass |
| a real update from 152 to 154: the cookie survives, and a second `update` says "already current" | pass | not unattended: the new build prompts, see below |
| port 9222 has the same owner before and after | pass | pass |

Run on 2026-10-02 on a Mac (macOS 26.5, Apple silicon) with `smoke.sh --real-keychain` and a human clicking Always Allow, while another Chrome for Testing held port 9222. Full run: 33 of 34; every keychain and update check passed, including the cookie surviving the update. The one failure was `npm install`, because the npm registry was unreachable. Run again with `--quick`: 33 of 33, including step 3. The keychain prompted twice, once for 154 at the first cookie write and once for 152 at step 6.

Checked by hand: shellcheck clean and a `/bin/bash` 3.2 syntax check (2026-10-02). On 2026-09-26, on macOS 15: `claude -p --strict-mcp-config` with only the `dedicated-browser` server drove the browser to a page, and Playwright MCP attached without starting a second browser; Vercel's `agent-browser --cdp` attached too.

**Keychain, measured in the VM and on the Mac.** Chrome for Testing keeps its key in the login keychain as "Chromium Safe Storage". The item's access list names each trusted build by code hash. On a fresh keychain the first start shows no prompt, and later starts of the same build show none either. A different build, including the one `update` installs, makes macOS ask again: `SecurityAgent` runs and cookie access blocks until someone answers. Always Allow adds that build to the list for good: on the Mac, 154 did not ask again after its one prompt. Every Chromium build that uses this item name shares the key. On the Mac the item already existed, created on 2026-03-30 by another Chromium build, so the first start prompted too.

**Not covered, and needs a human at the machine:**

- The window on the screen. Playwright's screenshots show the page drawn, but `screencapture` in the VM fails without the Screen Recording permission.
- The agent itself: Claude Code or Cursor calling the Playwright MCP tools in a clean VM.
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
