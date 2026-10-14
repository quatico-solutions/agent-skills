# dedicated-browser: turn translation off via pref (issue #87)

**Date:** 2026-10-13
**Source:** Hermes Agent (Qubert)

## Summary

Fixed dedicated-browser issue #87: the "Translate this page?" bubble kept appearing because
Chromium 153+ defines no feature named `Translate`, so `--disable-features=Translate` was a silent
no-op. The fix writes `translate.enabled=false` into the profile prefs instead. Merged and released
as v3.16.2.

## Key Accomplishments

- `backend_prepare_profile` now sets `translate.enabled=false` (same idempotent write as the existing
  `profile.password_manager_leak_detection = false`); `Translate` dropped from `CFT_DISABLED_FEATURES`.
- Corrected the feature-flag comment and the README "Kept"/"Added" tables. The remove point is
  Chromium **138** (present in the source at 137.0.7151.119, gone at 138.0.7204.183), not 153.
- Added a `translate.enabled=false` assertion to `tests/smoke.sh`.
- Merged #88, then released v3.16.2 (PR #89; `dedicated-browser` 0.1.0 → 0.1.1).

## Changes Made

- Modified: `skills/dedicated-browser/scripts/backend-chrome.sh`,
  `skills/dedicated-browser/README.md`, `skills/dedicated-browser/tests/smoke.sh`
- Created: `.changeset/20261013-fix-translate-feature.md`

## Decisions

- **Review feedback (Max, on #88):** keep the "Chrome for Testing 154" version note in the flag
  comment — the check was made against 154. The change *history* lives in the changeset/commit, not
  in code comments, so the three-line history block above `CFT_DISABLED_FEATURES` was removed. The
  remove point is 138. Dropped the model-specific `tuned-against` line — the change is model-independent.

## Next Steps

- [ ] Run the full `tests/smoke.sh` on a real Mac (GUI session, ~150 MB Chrome for Testing download
      ×3, real keychain prompt) to behaviourally confirm `translate.enabled=false` and the other seven
      disabled-feature names (MediaRouter, DialMediaRouteProvider, OptimizationHints,
      AutofillServerCommunication, AimEnabled, LensOverlay, FedCm). The PR was merged without this run;
      it is the open verification item. **Unverified** — no `smoke.sh` run was found in CI for this
      repo in the 24h after the merge. (A later change, `skills/dedicated-browser/tests/feature-names.sh`,
      appears in `main` and may cover the seven-names re-test; its status is outside this session and
      unverified here.)

## Repository State

- Merged: PR #88 (`de13b2a`) — the fix
- Merged: PR #89 (`79ebab5`) — release: 3.16.2
- Released: v3.16.2 (git tag + GitHub release + per-skill tag `dedicated-browser@0.1.1`)
- Branch `fix/issue-87-translate`: merged; remote deleted, local copy remains in the worktree

## Release-mechanics note (non-obvious — for the next release)

`main` is branch-protected and requires 3 green checks (validate, bb-tests-linux, bb-tests-macos).
Do **not** run `pnpm run release` locally and push: the direct push is refused and leaves a dangling
tag (the local `vX.Y.Z` tag is created before the push, so the later bot `create-release.sh` sees the
tag already exists and skips re-tagging at the correct commit). The sanctioned flow:

1. Merge the feature PR → the changeset bot opens `changeset-release/main` (the version-bump PR, e.g. #89).
2. Its CI can land in `action_required`. Approve the workflow runs:
   `gh api -X POST repos/quatico-solutions/agent-skills/actions/runs/<run_id>/approve` (as a token
   with write), then wait for the three checks to go green.
3. Merge the release PR (squash, to match the repo's `release: X.Y.Z` commit convention).
4. The `Release` workflow (on push to main) then creates the tag + GitHub release + Homebrew bump.

`pnpm run release` exists for local/maintainer use but is meant to run where the push is allowed; on a
protected `main` it must go through the bot PR instead.

## Automated wrap-up

Updated during an **automated idle-bye wrap-up** (triggered after 24h of thread inactivity; not
requested by a person). This log records the session as a checkpoint — the work was not continued.
Since the session, `main` has advanced past v3.16.2: a later release, **v3.17.0** (PR #93), exists,
and `skills/dedicated-browser/tests/feature-names.sh` was added. The Repository State above is the
snapshot at session end.
