# @quatico-solutions/agent-skills

## 3.8.2

### Patch Changes

- [#52](https://github.com/quatico-solutions/agent-skills/pull/52) [`eb38332`](https://github.com/quatico-solutions/agent-skills/commit/eb3833243236a795c8a385a1e8cad7fb4b796a02) Thanks [@qubert-quatico](https://github.com/qubert-quatico)! - Fix `bb api` unconditionally piping every response through `jq .`, which broke on non-JSON bodies (e.g. raw file content from the source endpoint) with a confusing `jq: parse error`. It now pretty-prints only when the body actually parses as JSON, and passes anything else through untouched.

  Also add a note about the global `-R` flag to the per-subcommand `--help` text for `bb source cat` and `bb api`, so it's visible from inside the subcommand help rather than only `bb --help`.

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 3.8.1

### Patch Changes

- [#48](https://github.com/quatico-solutions/agent-skills/pull/48) [`6b558d0`](https://github.com/quatico-solutions/agent-skills/commit/6b558d0449a960b27b11501798878cd489e985f4) Thanks [@eins78](https://github.com/eins78)! - bye: README described pre-2.2.0 behaviour, and the summary template hardcoded a path

  `bye` 2.2.0 made the sessionlog directory configurable, but the README still
  described the old behaviour in two places — one of which its own "Planned
  Improvements" list already marked as done:

  - **Tier** claimed the skill "works in any repository with a `sessionlogs/` or
    `changelogs/` directory". It works in any repository that _declares_ one.
  - **Known Gaps** listed "relies on `sessionlogs/` or `changelogs/` convention"
    as an open limitation. That gap was closed by 2.2.0. Replaced with the gap
    that is actually open: placement is prose, not a gate.

  Also, the final-summary template in `SKILL.md` printed
  `**Sessionlog:** sessionlogs/[file].md` — wrong in a code repo that keeps logs
  under `docs/sessionlogs/`, and wrong in any repo declaring something else. Now
  `<sessionlog directory>/[file].md`.

  The "Cursor session restoration not yet implemented" gap was checked and is
  **accurate** — that guide ships as an explicit placeholder. Left as is.

  No behaviour change.

  <!--
  bumps:
    skills:
      bye: patch
  -->

- [#50](https://github.com/quatico-solutions/agent-skills/pull/50) [`2fe8b87`](https://github.com/quatico-solutions/agent-skills/commit/2fe8b877f44c0fe4bb3dacd47b19bf1735d3b2a2) Thanks [@eins78](https://github.com/eins78)! - release: generate `.cursor-plugin/marketplace.json` too — it had been frozen at 2.0.0

  `generate-skill-manifests.sh` hardcoded the Claude manifest path and wrote only
  that file, so `.cursor-plugin/marketplace.json` was touched by nothing in the
  release pipeline. It still advertised `version: 2.0.0` and a single plugin entry
  while the package had reached 3.8.0 — every skill version Cursor could see was
  whatever happened to be true when the file was hand-written.

  `sync-versions.sh` did keep both `plugin.json` files in step, which is why this
  went unnoticed: the Cursor plugin's _own_ version was right, only its
  marketplace listing was stale.

  The generated `.plugins` array is identical for both targets; each file's own
  top-level fields are preserved (Claude's has a `metadata` block, Cursor's does
  not, and neither gains the other's). A listed manifest that does not exist is
  skipped rather than created — adding a marketplace is a deliberate act. If
  _none_ of them exists the script now exits 1 instead of quietly succeeding,
  because a release that silently updates no manifest is a broken release.

  No skill content changes, so this changeset carries no `bumps:` block — release
  tooling only, at the package level.

## 3.8.0

### Minor Changes

- [#46](https://github.com/quatico-solutions/agent-skills/pull/46) [`17560d9`](https://github.com/quatico-solutions/agent-skills/commit/17560d9e4572227fdc259be233b758cdfb8140d6) Thanks [@eins78](https://github.com/eins78)! - bye takes the sessionlog directory from a declared `Sessionlog directory` key
  under `## Session Wrap Up`, and when it is absent and several candidates exist,
  picks the most populated rather than the first in a fixed list — an abandoned
  directory no longer outranks the real one. Adds the ownership rule for repos
  that keep one home per unit, and a continuation rule so a running thread stays
  in one place. When a repository has no sessionlog directory, bye still creates
  nothing, but now checks for a parent or sibling workspace repo and asks instead
  of going silent.

  Consolidates the diverged personal fork into this copy: skill-directory links
  everywhere (relative links resolved against the working directory and broke),
  the skip/create decision table with a project-rules override, the hard stop
  when no home exists, and the session/token stats line. The
  project-instructions hook the fork had dropped is kept.

  <!--
  bumps:
    skills:
      bye: minor
  -->

## 3.7.0

### Minor Changes

- [#42](https://github.com/quatico-solutions/agent-skills/pull/42) [`b3d5516`](https://github.com/quatico-solutions/agent-skills/commit/b3d55167b734402dd3bff2c2c56e4163c6ef6e58) Thanks [@jwloka](https://github.com/jwloka)! - Harden skills against documented Claude Opus 5 failure modes: delete style constraints and cross-skill duplication (net 92 fewer lines), bound the TDD verification cycle, and add an untrusted-content rule judged by target rather than authorship — in one owning skill plus `bb --help`, with `bb pr view --comments` fencing third-party comment bodies

  <!--
  bumps:
    skills:
      test-driven-development: minor
      jest-testing-conventions: minor
      handling-pull-requests: minor
      triage-ticket: minor
      working-with-jira-web: minor
      working-with-bitbucket-web: minor
      working-with-bitbucket-api: minor
      branch-and-commit: patch
    tuned-against: claude-opus-5
  -->

### Patch Changes

- [#43](https://github.com/quatico-solutions/agent-skills/pull/43) [`66516be`](https://github.com/quatico-solutions/agent-skills/commit/66516be4018b7012ae1cc0e908d77816590fb527) Thanks [@eins78](https://github.com/eins78)! - Fix `bb` on macOS's system bash 3.2, where `--state`, `--method`, `--data`, `--remove-reviewer` and `--jq` all aborted, and gate it with a CI job that runs the suite against `/bin/bash` on macOS

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

- [#45](https://github.com/quatico-solutions/agent-skills/pull/45) [`91e6b07`](https://github.com/quatico-solutions/agent-skills/commit/91e6b07a13d12d3976826c990e286230f6b657ab) Thanks [@eins78](https://github.com/eins78)! - Document the reworked `bb` CI in the test suite README: both platform jobs now always run and filter inside the job, rather than being path-filtered on the trigger with a mirrored skip workflow

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 3.6.0

### Minor Changes

- [#33](https://github.com/quatico-solutions/agent-skills/pull/33) [`d300152`](https://github.com/quatico-solutions/agent-skills/commit/d300152fbbc25ab657474ee5424a67942216f888) Thanks [@michaelaemisegger](https://github.com/michaelaemisegger)! - working-with-bitbucket-api: accept modern Atlassian account_id (realm:uuid) as a direct `--reviewer` identifier, not only legacy 24-char-hex ids

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: minor
  -->

### Patch Changes

- [#40](https://github.com/quatico-solutions/agent-skills/pull/40) [`50c0378`](https://github.com/quatico-solutions/agent-skills/commit/50c0378e193ce663f83e86c6405347d01fa9eedb) Thanks [@jwloka](https://github.com/jwloka)! - CI: report the required `bb-tests` check on PRs that do not touch the `bb` CLI, so unrelated PRs are no longer permanently blocked

  <!--
  No skill bumps: this changes CI configuration only, no skill content.
  -->

- [#34](https://github.com/quatico-solutions/agent-skills/pull/34) [`4c3583d`](https://github.com/quatico-solutions/agent-skills/commit/4c3583d4937e49d214d45ed27338c8ab5cb5d7a9) Thanks [@qubert-quatico](https://github.com/qubert-quatico)! - schweizer-schreibweise: refresh glossary sources and harden the downloader

  Re-ran the source pipeline. OpenThesaurus grew by 11 Swiss-tagged terms and
  Wikipedia added one Helvetism (Störefried → Störenfried), yielding 10 net new
  entries in `glossary-full.md` (1113 → 1123); the curated core glossary is
  unchanged. Also hardened `update-sources.sh`: it now validates the `%PDF-`
  magic and falls back to the latest Wayback Machine snapshot when a primary URL
  fails, so the recurring bk.admin.ch `/dam/` 502s no longer write 16-byte error
  pages over the Bundeskanzlei PDFs.

  <!--
  bumps:
    skills:
      schweizer-schreibweise: patch
  -->

## 3.5.0

### Minor Changes

- [#31](https://github.com/quatico-solutions/agent-skills/pull/31) [`2d167b4`](https://github.com/quatico-solutions/agent-skills/commit/2d167b4ce6d1d70be6d10ded3d9be506691803c0) Thanks [@eins78](https://github.com/eins78)! - working-with-bitbucket-api: install `bb` by **copy into `$(brew --prefix)/bin`** instead of symlinking into `~/bin`. Fixes two real-world failures: `~/bin` is not on macOS default PATH (fresh machines got a non-functional install), and symlinks into the version-based plugin cache dangle after every plugin update. **Homebrew is now an official, documented dependency of the installer** (it was already assumed for `jq`); non-Homebrew setups get an escape hatch: `BB_INSTALL_DIR=<dir-on-PATH> ./install-dependencies.sh` with self-provided `jq`. The installer cleans up the legacy `~/bin/bb` symlink, warns when a foreign `bb` shadows the new one on PATH, and the Step 0 gate verifies by version comparison alone (the `readlink` provenance check is gone — a stale copy is caught by comparing `bb --version` against the skill's `BB_VERSION`).

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: minor
  -->

## 3.4.1

### Patch Changes

- [#28](https://github.com/quatico-solutions/agent-skills/pull/28) [`9a0c106`](https://github.com/quatico-solutions/agent-skills/commit/9a0c10662341241d68c950ae22a857bce6a6b8f4) Thanks [@eins78](https://github.com/eins78)! - working-with-bitbucket-api: state that this skill is the single source of truth for the `bb` command surface — repos must not keep a local `gh`→`bb` translation table (it drifts and spreads stale mappings); translate on the fly instead.

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->
  </content>

- [#29](https://github.com/quatico-solutions/agent-skills/pull/29) [`4f5da72`](https://github.com/quatico-solutions/agent-skills/commit/4f5da723bd01dd5fa073939584aad25582a34dcb) Thanks [@eins78](https://github.com/eins78)! - working-with-bitbucket-api: turn the "Prerequisites" step into a real **Step 0 version gate**. The old check only confirmed `bb` _runs_ — so an older build, or a `~/bin/bb` symlink left pointing into a previous plugin version, passed while silently lacking newer subcommands/flags, producing failures that look like API/auth errors. The gate now compares `bb --version` and `readlink -f "$(command -v bb)"` against the version this skill ships (`BB_VERSION`), reinstalls from the skill if it's missing/older/foreign, and adds the rule: never diagnose a `bb` error before ruling out a version mismatch.

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 3.4.0

### Minor Changes

- [#26](https://github.com/quatico-solutions/agent-skills/pull/26) [`5c1edfd`](https://github.com/quatico-solutions/agent-skills/commit/5c1edfd03b26004ecec85114cd73052bfdc917ef) Thanks [@michaelaemisegger](https://github.com/michaelaemisegger)! - schweizer-schreibweise: percent and unit formatting — comma decimal (8,1 %, never the currency point) and a space before % and unit symbols

  <!--
  bumps:
    skills:
      schweizer-schreibweise: minor
  -->

## 3.3.0

### Minor Changes

- [#24](https://github.com/quatico-solutions/agent-skills/pull/24) [`8e92e74`](https://github.com/quatico-solutions/agent-skills/commit/8e92e74207c258745ae6b5e87661874cdda282ca) Thanks [@eins78](https://github.com/eins78)! - Remove the writing-clearly-and-concisely skill from this repo. It packaged
  public-domain content (Strunk, _The Elements of Style_, 1918) from an upstream
  project; to keep using it, install it from upstream:
  <https://github.com/obra/the-elements-of-style>.

## 3.2.0

### Minor Changes

- [#22](https://github.com/quatico-solutions/agent-skills/pull/22) [`df688e1`](https://github.com/quatico-solutions/agent-skills/commit/df688e16fc8caf675864652cc023d81107824d16) Thanks [@eins78](https://github.com/eins78)! - Document the global `-R workspace/repo` flag in `working-with-bitbucket-api` so agents know `bb source` (and every other command) can target a repo other than the current directory's

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: minor
  -->

### Patch Changes

- [#21](https://github.com/quatico-solutions/agent-skills/pull/21) [`44a134f`](https://github.com/quatico-solutions/agent-skills/commit/44a134fcb45d4bde3542f79f6734707177446f71) Thanks [@eins78](https://github.com/eins78)! - `bb --version` now reports the skill's actual version — the internal `BB_VERSION` string had been stuck at 1.0.0 across releases. The release chain (`sync-versions.sh`) keeps it in lockstep with the skill version from now on.

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 3.1.0

### Minor Changes

- [#19](https://github.com/quatico-solutions/agent-skills/pull/19) [`8ccf35b`](https://github.com/quatico-solutions/agent-skills/commit/8ccf35b5d6e00f7372b4e66aad1e386768877e6f) Thanks [@eins78](https://github.com/eins78)! - working-with-bitbucket-api: `bb pr list` gains gh-compatible `--json <fields>` field selection and a `--jq <expr>` passthrough for scripting

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: minor
  -->

## 3.0.0

### Major Changes

- [#16](https://github.com/quatico-solutions/agent-skills/pull/16) [`8fbf88c`](https://github.com/quatico-solutions/agent-skills/commit/8fbf88c3633bbf8fe97aae0ebfb53b57e7c6eaa8) Thanks [@eins78](https://github.com/eins78)! - Remove challenge-the-plan (skill + /challenge-the-plan command) — it moved to [plot-pm/plot](https://github.com/plot-pm/plot): plan interrogation is the design-phase companion of the Plot lifecycle (idea → challenge → tracer → approve). Install it via the plot marketplace. Major: breaking for anyone installing challenge-the-plan from this marketplace.

- [#15](https://github.com/quatico-solutions/agent-skills/pull/15) [`5d34119`](https://github.com/quatico-solutions/agent-skills/commit/5d34119e1d2ee5cdac919af7a716568150ba27af) Thanks [@eins78](https://github.com/eins78)! - Remove story-tracking — it moved to [plot-pm/plot](https://github.com/plot-pm/plot): stories and plans are sibling concepts (stories = long-running umbrella, plans = approved actionable units), so the skill lives with the Plot workflow in its vendor-neutral org. Install it via the plot marketplace. Major: breaking for anyone installing story-tracking from this marketplace. README gains a moved-skills callout; the markdown skill's dev notes point at the new home.

  <!--
  bumps:
    skills:
      markdown: patch
  -->

### Minor Changes

- [#14](https://github.com/quatico-solutions/agent-skills/pull/14) [`6425b78`](https://github.com/quatico-solutions/agent-skills/commit/6425b785981f040665075d28a98296c49539b2c3) Thanks [@eins78](https://github.com/eins78)! - New skill: typescript-strict-patterns — strict TypeScript coding patterns (discriminated unions, branded types, Zod at boundaries, const arrays over enums, safe access). Adopted from eins78/agent-skills.

  No `bumps:` block — the skill is new and ships at its authored version (1.0.0); listing it in `bumps:` would double-bump it at release.

## 2.1.0

### Minor Changes

- [#10](https://github.com/quatico-solutions/agent-skills/pull/10) [`3bfaa56`](https://github.com/quatico-solutions/agent-skills/commit/3bfaa56a10420a589debbc6fc40162dd794ac6cb) Thanks [@eins78](https://github.com/eins78)! - bb CLI: attach images to PRs via the Downloads area — no browser needed. Adds `bb download upload` / `bb download list` and a `bb pr comment --image` convenience flag, and corrects the Bitbucket skills that wrongly claimed image uploads require a browser / have "no API support" ([#9](https://github.com/quatico-solutions/agent-skills/issues/9)).

  Also fixes an intermittent EPIPE crash in the bb test harness: `run-bb.ts` now swallows stdin write errors that occur when a fast-exiting command closes its stdin before the helper finishes writing to it.

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: minor
      handling-pull-requests: minor
      working-with-bitbucket-web: patch
  -->

## 2.0.3

### Patch Changes

- [#6](https://github.com/quatico-solutions/agent-skills/pull/6) [`28c6d5a`](https://github.com/quatico-solutions/agent-skills/commit/28c6d5ad364db3097a4e0d929a934cf6c41cb355) Thanks [@eins78](https://github.com/eins78)! - working-with-bitbucket-api: add a loopback-restricted `BB_API_URL` test seam (refuses non-local hosts so the auth token can't be exfiltrated), guard `bb pr comment --line` against a missing `--file`, and add a 149-test integration suite (node:test + mock server) covering every `bb` command and flag.

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 2.0.2

### Patch Changes

- [#3](https://github.com/quatico-solutions/agent-skills/pull/3) [`cfae9d6`](https://github.com/quatico-solutions/agent-skills/commit/cfae9d6e911da3ebeae054d1cd61f0f39133c828) Thanks [@eins78](https://github.com/eins78)! - working-with-bitbucket-api: clearer scope list and an "Open in browser? [Y/n]" prompt in `bb auth login`

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 2.0.1

### Patch Changes

- [#1](https://github.com/quatico-solutions/agent-skills/pull/1) [`9707668`](https://github.com/quatico-solutions/agent-skills/commit/9707668f68989225664ed75de47a5b7e1b22f019) Thanks [@michaelaemisegger](https://github.com/michaelaemisegger)! - working-with-bitbucket-api: send an empty `{}` body on PR approve/decline so Bitbucket doesn't reject the request with HTTP 400

  <!--
  bumps:
    skills:
      working-with-bitbucket-api: patch
  -->

## 2.0.0

Initial public release: the `quatico-skills` plugin — 17 skills for AI-assisted
development with Claude Code and Cursor (git/PR workflows, commit notation, TDD,
Jest, Bitbucket/Jira, Swiss German, clear writing, and more). Extracted and
sanitized from Quatico's internal skills monorepo. MIT licensed.
