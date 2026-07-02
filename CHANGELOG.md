# @quatico-solutions/agent-skills

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
