# Sprint: bb cli hardening

> bb fails loudly, says who it is, and says where it comes from.

## Status

- **State:** Active
- **Start:** 2026-10-28
- **End:** 2026-10-30
- **Release:** 3.19.0

## Sprint Goal

`bb` 1.12.1 ends a rate-limited call with empty output once its retries run out, has no command that names the authenticated account, and shares its name with two unrelated Homebrew packages. Each Must Have below lists the acceptance criteria of its ticket.

- **#111 — rate limits, `--head`, api paths.** After the last 429 retry, `bb` exits with a distinct non-zero code (for example 4) and writes one stderr line that names the wait Bitbucket asked for (`Retry-After` when present). stdout stays empty. An `--all` walk that fails partway exits non-zero and prints no partial array. `bb pr list --head <branch>` is repeatable, maps to `q=source.branch.name="<branch>"`, combines with `--state`, and costs one request. `bb api` with a path that has no leading `/` either normalises the path or refuses locally with `path must start with /`, instead of HTTP 403.
- **#112 — `bb whoami`.** `bb whoami` prints nickname, display name, account id and the credential source (config file or `BITBUCKET_*` env), and never the token. It exits non-zero when not authenticated and supports `--json`. An alias `bb auth status` is acceptable.
- **#113 — install source.** `bb --help` and `bb --version` name the install source, for example `bb 1.12.1 (quatico-bb — brew install quatico-solutions/tap/quatico-bb)`. The `working-with-bitbucket-api` skill names the Homebrew tap as the supported install and names `--cask bb` and `bb-cli` as look-alikes that an agent must not use instead.

### Must Have

<!-- An item is `- [ ] <description>`. A leading `[<plan-slug>]` names the plan
     it commits to, and only a plan slug is read as one: `- [ ] [#123](url) …`
     names an issue, so it is an item with no plan and is scored on its
     checkbox. Strike a reference — `~~[<plan-slug>]~~` — to mark an item that
     left the sprint; the plan's own state then says whether it was withdrawn. -->

- [x] [bb-scripted-calls] ([#111](https://github.com/quatico-solutions/agent-skills/issues/111)) no exit 0 without an HTTP 2xx; HTTP 429 exits 75 with `Retry-After` on stderr when sent; a failed `--all` walk prints no partial array; repeatable `pr list --head` combines with `--state`; `bb api` normalises a path without leading `/` <!-- pr: #0, branch: bug/bb-api-path-slash -->
- [x] [bb-whoami] ([#112](https://github.com/quatico-solutions/agent-skills/issues/112)) `bb whoami` prints account and credential source without the token, exits non-zero when unauthenticated, supports `--json`
- [ ] [bb-install-source] ([#113](https://github.com/quatico-solutions/agent-skills/issues/113)) `bb --help` and `--version` name the install source; `working-with-bitbucket-api` names the supported tap and the two look-alikes

### Should Have

<!-- add items here -->

### Could Have

- [ ] [bb-install-source] ([#113](https://github.com/quatico-solutions/agent-skills/issues/113)) skills and scripts that call `bb` run a one-line self-check (`bb --version | grep -q quatico-bb`) and print a clear message instead of failing on an unknown flag — second slice of the plan, optional in the ticket

### Deferred

<!-- Items moved here during sprint when they won't make the timebox -->

## Retrospective

<!-- Filled during /plot-sprint close: What went well / What could improve / Action items -->

## Notes

### Scope Changes

<!-- Log scope changes here: added/removed items, tier changes, with date and reason -->
<!-- Format: - YYYY-MM-DD: Added/Moved/Removed [slug] reason -->

<!-- Session log, decisions, links -->
