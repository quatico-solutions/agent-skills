# @quatico-solutions/agent-skills

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
