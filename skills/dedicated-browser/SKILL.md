---
name: dedicated-browser
description: "Use when the agent needs a web browser that is signed in to systems the human chose: a separate Chrome for Testing with its own saved logins, so the agent never touches the human's everyday browser. Installs, starts and checks it, and connects it to the agent through Playwright MCP. Triggers: browser, log in to a site, page behind a login, sign in, scrape, web UI, dedicated browser, separate browser, Playwright MCP."
license: MIT
compatibility: claude-code, cursor
metadata:
  version: "0.0.0"
---

# Dedicated Browser

A separate browser for the agent, with its own saved logins. The human signs in only to the systems
the agent should reach. The agent never gets the human's everyday browser, which is signed in to
everything.

It is Chrome for Testing: its own app in the Dock and in Cmd-Tab, with a different icon, so the
human can tell at a glance which window is the agent's. Since version 136, Chrome also refuses
remote control of its default profile, so the agent needs a profile of its own anyway.

For a human at their own Mac. Servers, headless runs and start-at-login are out of scope.

## Rules

- Drive this browser only through the `mcp__dedicated-browser__browser_*` tools. Do not use
  `mcp__playwright__*`, `mcp__claude-in-chrome__*`, `mcp__chrome-devtools__*` or any other browser
  tool for this work: they may drive the human's everyday browser, or a browser without the
  logins. If the tools are missing, stop and tell the human (see First run). Do not switch.
- Never send raw HTTP or WebSocket calls to the debugging port, and never start Chrome by hand.
  Playwright tracks browser state; calls behind its back break the next tool call.
- While the browser runs, any program on this Mac can control it through the local debugging
  port. Stop it when the work is done: `stop`.

The CLI below is `${CLAUDE_SKILL_DIR}/scripts/dedicated-browser`. Where that variable is not set,
the scripts sit in the `scripts/` folder next to this file. Messages that name a next step print
the CLI's full path.

## Before the first browser action in a session

```bash
"${CLAUDE_SKILL_DIR}/scripts/dedicated-browser" status
```

| Result | Do |
|---|---|
| exit 0, `running: …` | Go on. If a `note:` says the browser is behind the current stable, tell the human once and offer the update (see Keeping it current). |
| exit 1, `not installed` | First run, below. |
| exit 1, `not running` | `dedicated-browser start`, then `status` again. |
| exit 2 | Something else answers on the port, or the MCP server points at another host. **Do not use it**: it may be the human's own browser. Tell the human. |

Then check that `mcp__dedicated-browser__browser_*` tools exist in this session. If not, the MCP
server is not registered yet, or the agent was not restarted after registering it. Do First run
step 2 with the human.

## First run (with the human at the machine)

1. `dedicated-browser setup`. It downloads Chrome for Testing (about 150 MB) into
   `~/Library/Application Support/dedicated-browser/`, starts it, and prints the MCP config.
2. Register the MCP server under the name `dedicated-browser` (setup prints the exact line for
   Claude Code and for Cursor), then restart the agent so it loads. A different name, or the
   official `playwright` plugin, gives tools named differently, and that plugin's server starts its
   own separate Chromium instead of attaching to this one.
3. Ask the human to do two things in the browser window that opened:
   - click **Always Allow** if macOS asks about "Chromium Safe Storage". It protects the saved logins on disk;
   - sign in to the systems the agent should reach. Nothing else needs a login here.

**If browser calls hang after the first start or after an update**, that keychain prompt is waiting on the human's screen. Cookie access blocks until it is answered. Ask them to look for it.

## Using the browser

- **One call at a time.** Parallel tool calls race the same browser.
- **One tab.** Close tabs when done with `browser_tabs` (action `close`). Closing through
  `page.close()` inside code, which has been seen to fail silently over the debugging port. With
  10 or more tabs, close all and start fresh.
- **SPAs:** read text with `innerText`, not `textContent`. React can leave text nodes empty.
- **Many pages:** call `page.goto()` inside `browser_run_code_unsafe` (called `browser_run_code`
  in older Playwright MCP versions) rather than one tool call per page. Wait 1 to 2 seconds
  between pages. If a site starts blocking, stop and wait about 5 minutes.
- **No files in that sandbox:** `require('fs')` is unavailable. Return the data as the result.
- **Cloudflare or similar challenge page:** wait. It usually clears on its own. Do not retry in a
  loop or open a second tab to the same site. Real blocks are rare and need a different network,
  not another browser restart.

## Keeping it current

Chrome for Testing does not update itself, and an old build can be refused by some login pages.
`start` and `status` compare it with the published stable version (at most once a day) and print a
`note:` when it is a major version behind. They never download anything.

When you see the note: tell the human once per session and ask. Never update on your own: it
closes a browser they may be using. With their agreement:

```bash
dedicated-browser stop && dedicated-browser update && dedicated-browser start
```

Logins stay in the profile across the update. The keychain sees the new build as a different program, so on the first page that needs the logins macOS asks about "Chromium Safe Storage" again. Tell the human before you start, and ask them to click **Always Allow**.

## Troubleshooting

- **`status` says not running:** `start`. A `start` that finds the browser open but silent (opened
  by hand, or stuck) tells you to `stop`, then start again.
- **Clicks time out on "visible, enabled and stable" and the element is fine:** the window is
  hidden behind another one or the display is asleep, so the page stops drawing frames. This
  browser's launch flags prevent that. If it happens anyway, the browser was not started by
  `start`: `stop`, then `start`. Confirm with `document.visibilityState` reading `hidden` on a
  visible page.
- **A sign-in page says the browser "behaves strangely" and refuses credentials, while the same
  login works in Safari on the same machine:** check `status` for the behind-stable note and
  update. Compare browsers on one machine. Do not diagnose from status codes: a `429` from a
  bot-defence sensor endpoint is often that vendor's normal handshake, not a rate limit.
- **Two Chrome windows open when the agent works:** the tools in use are not
  `mcp__dedicated-browser__*`, and some other Playwright server started its own browser. Stop
  and tell the human.
- **A "Sign in with Google" (or other provider) button does nothing:** this browser turns off FedCM, the browser's own sign-in dialog, on purpose. Look for the site's other sign-in path (a link to the provider's login page, or email and password), or ask the human to sign in.
- **Anything else the skill does not cover:** report it at
  https://github.com/quatico-solutions/agent-skills instead of working around it silently.
