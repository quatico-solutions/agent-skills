# The cmux backend

The agent's browser is a pane beside its own terminal in cmux, in cmux's Default profile. cmux's own browser is the
agents' browser: the human keeps their own logins in another browser, such as Safari or Chrome, and signs in here only
to what agents should reach. Everything signed in to in the Default profile is within any agent's reach in cmux, not
only through this skill. Each agent workspace gets its own pane; all of them share the profile's logins. The engine is
WebKit, like Safari.

`dedicated-browser` below is `${CLAUDE_SKILL_DIR}/scripts/dedicated-browser`.

## Rules

- Drive the pane only with `dedicated-browser run`. Never call `cmux browser …` yourself: a pane opened without
  `--profile` lands in whichever profile was used last, and the REPL reaches every tab in every workspace, the human's
  and other agents'.
- Work in `page`, the agent's pane. `tabs.open`, `tabs.content` and `tabs.history` throw on purpose, and `tabs.use`,
  `tabs.get` and `tabs.list` see only the agent's pane. Do not try to get around this: it keeps you off the human's
  tabs and other agents' panes, and a new tab would open in whichever profile was used last.
- One `run` at a time. Calls share one session per pane.
- When the work is done: `dedicated-browser stop` closes the pane. Logins stay in the profile.

## First run (with the human at the machine)

Inside cmux there is nothing to set up: `status` says `backend: cmux` on its own.

1. `dedicated-browser start` opens the pane beside this terminal, without taking focus. `dedicated-browser setup`
   does the same and also prints a short note for the human. Nothing to install, no MCP server to register.
2. When a task needs a login the pane does not have yet, ask the human to sign in, in that pane, to the systems the
   agents should reach. The first time, tell them: cmux's browser is the agents' browser; everything signed in to in
   its Default profile is within any agent's reach; their own logins belong in another browser.

To use Chrome for one session instead (a site that needs Chromium, a phone passkey): `DEDICATED_BROWSER_BACKEND=chrome`
on every command of that session, `setup` included.

### A profile of its own (opt-in)

A human who uses cmux's browser as their everyday browser (assumed rare) has no dedicated browser in its Default
profile. They set `DEDICATED_BROWSER_CMUX_PROFILE=<name>` in the environment the agents start in, to give the agents a
cmux browser profile of their own, or `DEDICATED_BROWSER_BACKEND=chrome`. With the profile set,
`dedicated-browser setup` creates it once and opens the pane; `start` and `run` use it from then on. Tell the human
that everything signed in to in that profile is the agents'.

cmux opens a pane without a chosen profile in the last-used one, and opening the agent's pane makes the agent's profile
the last-used one. `start` and `run` set it back to the human's profile, also after cmux reopens and restores the
agent's pane. That matters only when the human uses a profile other than the agent's: in Default mode with the human
in Default too, nothing changes. If `setup` or `start` printed a `note:` about new browser panes, the setting back did
not take: tell the human once that cmux now opens their new browser panes in the agent's profile until they pick
another, and that anything they sign in to there, the agents can use.

## `run`

```bash
dedicated-browser run 'await page.goto("https://example.com"); snapshot({ interactive: true })'
dedicated-browser run 'await page.locator("e3").fill("name@example.com"); await page.locator("e5").click(); snapshot()'
dedicated-browser run - <<'JS'
const rows = await page.extract({ $: "table tr", name: "td:nth-child(1)", link: "a@href" });
rows
JS
```

- The API is cmux's Playwright-style REPL, on the agent's pane: `page`, locators, refs from `snapshot()` (`e5`),
  `page.markdown()`, `page.extract()`, `page.searchText()`, `fetch()` with the pane's cookies, `secrets`,
  downloads, `screenshot()`. `cmux browser repl guide` prints the whole guide; skip its parts about other tabs.
- Take refs from the latest `snapshot()`: they count up per tab and are never reused, so `e3` above is an example.
- The last expression's value prints, followed by `[ok | 12ms]`. Top-level `const` and `let` live on into the next
  `run` of the same pane, until 30 idle minutes end the session.
- `--timeout <ms>` (default 120 s per call) and `--max-output <chars>` (default 25,000; longer output goes to a file
  whose path prints).
- `fs` in the REPL reaches only the directory the command runs in and the temp directory.
- Exit 1 on a script error, a syntax error or a rejected promise, with the error printed.
- To cmux, the pane is the human's tab, not one the REPL opened. Its dialogs, file choosers and downloads go to the
  human unless the script listens for them first: `page.waitForEvent("download")` before the click that starts a
  download, `page.on("dialog", …)` before the action that opens a dialog. Cmd-C, Cmd-X and Cmd-V do not work there.
- A pop-up (a sign-in window, a link with `target="_blank"`) opens in the agent's profile:
  `const [popup] = await Promise.all([page.waitForEvent("popup"), page.click("…")])`.

## Troubleshooting

- **`status` exits 1, "not running in this workspace":** `dedicated-browser start`. The human may have closed the pane.
- **`status` exits 1, "not set up":** the opt-in profile does not exist yet. `dedicated-browser setup`, with the human.
- **`status` exits 2:** only when `DEDICATED_BROWSER_BACKEND=cmux` forces this backend: the agent is not inside cmux,
  or cmux's browser is off. Do not use it; tell the human.
- **An error says `blocked`:** the code reached past the agent's pane. Do it in `page` instead.
- **A site misbehaves in WebKit, or needs a phone passkey:** ask the human whether to use Chrome for this task
  (`DEDICATED_BROWSER_BACKEND=chrome`, with Chrome's own first run if it is not set up).
- **Anything else the skill does not cover:** report it at https://github.com/quatico-solutions/agent-skills instead of
  working around it silently.
