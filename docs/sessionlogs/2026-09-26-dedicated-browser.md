# Add the dedicated-browser skill

**Date:** 2026-09-26
**Source:** Claude Code

## Summary

Wrote `dedicated-browser` from scratch: a separate browser for the agent, with its own saved
logins, so the human signs in only to the systems the agent should reach. It is a rewrite for a
person at their own Mac, not an edit of an existing remote-host browser skill. Delegated session,
so the work sits on its own branch as a draft PR.

## Key Accomplishments

- A CLI (`setup`, `start`, `stop`, `status`, `update`) over a sourced Chrome for Testing backend.
  Browser-specific code sits behind six functions, the seam for a later Safari backend.
- `status` and `start` refuse to treat another browser answering on the port as the dedicated one.
  The decoy test found the first version of this check was wrong: it matched any process using the
  profile, not the process owning the port.
- A smoke test on a real Mac: real download, stop and start, a real 152 to 154 update with a
  cookie surviving, a decoy browser on the port, and the port of an unrelated browser unchanged.
  31 of 31 checks pass in unattended mode.
- Checked that a Playwright MCP server registered as `dedicated-browser` drives the browser, and
  that Vercel's `agent-browser` can attach to it over `--cdp`.

## Changes Made

- Created: `skills/dedicated-browser/` (`SKILL.md`, `README.md`, `scripts/dedicated-browser`,
  `scripts/backend-chrome.sh`, `tests/smoke.sh`, `tests/cookie.mjs`)
- Created: `docs/plans/2026-09-26-dedicated-browser.md` and its `active/` symlink
- Created: `.changeset/20260926-120735.md` (minor, `tuned-against: claude-sonnet-5`)
- Modified: `README.md` (skills table, count 18 to 19), `CLAUDE.md` (count 18 to 19)

## Decisions

- **Name `dedicated-browser`:** `agent-browser` is taken by Vercel's CLI and by a skill of the
  same name that tells the agent to prefer it over other browser tools.
- **Behind stable: warn only.** The failure it prevents was seen once in many months across
  several machines, so nothing downloads without being asked. There is no fallback to an installed
  Chrome, which would put the agent in a browser that looks like the human's.
- **Real macOS keychain, not the mock keychain.** Cookies are protected at rest, at the cost of
  one "Always Allow" prompt. Until it is answered, cookie access blocks. The choice is permanent
  for a profile, so the launch flags never change.
- **Port 9393**, not 9222: the port every tool reaches for first is often already taken.
- **We launch the browser ourselves.** Vercel's `agent-browser` always adds the mock-keychain flags
  when it launches a profile directory and owns a random port through its daemon. It stays
  possible as a driver over `--cdp`. No user-facing recommendation yet.
- **CDP plus Playwright MCP** rather than letting Playwright launch the profile: the browser
  outlives agent sessions, several sessions can share it, and the human can sign in with no agent
  running.

## Plan Reference

- Plan: `docs/plans/2026-09-26-dedicated-browser.md`
- Planned: the skill, the CfT-behind-stable answer, the MCP wiring, the test approach.
- Executed: as planned, with the port changed from 9333 to 9393, and the port-ownership check
  added after the decoy test.

## Next Steps

- [ ] Run `skills/dedicated-browser/tests/smoke.sh --real-keychain` at the machine and click
      Always Allow. The unattended runs used a mock-keychain copy of the scripts, so the real
      keychain path is untested. Note whether the prompt returns after `update`.
- [ ] Confirm the plan's `Phase:` value. `In Progress` was a guess at the Plot vocabulary.
- [ ] Confirm `tuned-against: claude-sonnet-5`. The plan was written under Opus 5.5 and the build
      under Sonnet 5.
- [ ] Find out which skill-directory variable Cursor substitutes (`${CLAUDE_SKILL_DIR}` was used).
- [ ] Run the Intel (`mac-x64`) download once.
- [ ] After more testing, decide whether to mention Vercel's `agent-browser` to users.
- [ ] After about a week of use, point `working-with-jira-web` and `working-with-bitbucket-web` at
      this skill for SSO pages. Separate change.
- [ ] Fold in the usage data from the author's machines when it exists. None was available.

## Repository State

- Committed: `cb93d2e` - F: Add dedicated-browser, a separate browser for the agent
- Committed: `0888f59` - D: List dedicated-browser in the skills table, with its plan and changeset
- Branch: `worktree-q-agent-browser`. Draft PR, not merged.
