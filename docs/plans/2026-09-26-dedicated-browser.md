# A separate browser for the agent: `dedicated-browser`

> A new skill that gives the agent its own browser with its own saved logins, so the human signs
> in only to the systems the agent should reach and never hands over their everyday browser.

## Status

- **Phase:** In Progress
- **Type:** feature
- **Story:** <!-- optional, story slug (docs/stories/<slug>/) — the durable intent this plan serves -->
- **Sprint:** <!-- optional, filled when plan is added to a sprint -->
- **Review:** in-session
- **Impl:** same branch
- **Approved:** 2026-09-26, Max Albrecht, in-session
- **Started:** 2026-09-26, Max Albrecht, `worktree-q-agent-browser`

## Changelog

- New skill `dedicated-browser`: Chrome for Testing with its own profile on a fixed local port,
  connected to the agent through Playwright MCP. macOS, interactive use.

## Motivation

Agents need a logged-in browser for internal web UIs. Pointing the agent at the human's everyday
browser gives it access to everything that browser is signed in to. A separate browser with its
own profile fixes that: the human signs in only to what the agent should reach. It also has to be
easy to tell apart at a glance (Chrome for Testing has its own icon), and easy to set up for
someone who is not an infrastructure person.

This is a rewrite for that reader, not a copy of the author's `chrome-browser` skill, which keeps
serving remote and headless hosts.

## Design

### Approach

Full notes, including what was kept from and cut from `chrome-browser`, are in
[`skills/dedicated-browser/README.md`](../../skills/dedicated-browser/README.md). In short:

- One CLI (`setup | start | stop | status | update`) plus a sourced `backend-chrome.sh`. Everything
  browser-specific sits behind six functions, which is the seam for a later Safari backend.
- Two settings: `DEDICATED_BROWSER_PORT` (default **9393**) and `DEDICATED_BROWSER_HOME`.
- The agent attaches through Playwright MCP `--cdp-endpoint`, registered as `dedicated-browser`.
- **Behind stable: warn only.** The published CfT stable version is compared once a day. Nothing
  downloads without being asked. No fallback to an installed Chrome.
- **Real macOS keychain**, not the mock keychain. One "Always Allow" prompt on first run.
- `status` and `start` refuse to treat another browser answering on the port as the dedicated one.

Considered and not used as the launcher: Vercel's `agent-browser` (mock keychain, random
daemon-owned port, competing skill). It can attach over `--cdp`, which was checked.

### Open Points

- [ ] Real-keychain path and whether the prompt returns after an update: needs a human at the
      machine (`tests/smoke.sh --real-keychain`).
- [ ] Which skill-directory variable Cursor substitutes (`${CLAUDE_SKILL_DIR}` or `{{SKILL_DIR}}`).
- [ ] Intel Macs: the `mac-x64` download was not run.
- [ ] Whether to mention Vercel's `agent-browser` to users. Decide after more testing.
- [ ] After about a week of real use: point `working-with-jira-web` and
      `working-with-bitbucket-web` at this skill for SSO pages. Separate change.

## Branches

- `worktree-q-agent-browser` — the whole skill. Delegated session: the maintainer's instruction was
  to work only on this branch, push only here, and open no pull request until told. The name does
  not follow the Plot prefixes for that reason.

## Definition of Done

- [x] `pnpm test` passes — skills parse
- [x] `pnpm run validate` passes — skill frontmatter valid
- [x] `bb` suite — not applicable, the diff does not touch `cli/bb`
- [x] Changeset added with a `bumps:` block and `tuned-against:`
- [x] `README.md` skills table matches `skills/`

## Notes

- This file was written by hand: the Plot commands would have opened a plan PR, which this
  session was told not to do.
- Unattended test runs used a mock-keychain copy of the scripts; see the Testing section of the
  skill's README for what that does and does not cover.
