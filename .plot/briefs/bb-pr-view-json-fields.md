# Implementation brief — bb-pr-view-json-fields

- **Plan (canonical):** `docs/plans/2026-10-23-bb-pr-view-json-fields.md` on `main`
- **Approved:** 2026-10-23, jwloka, in-session
- **Branch:** `bug/bb-pr-view-json-fields` (base: `main`)
- **Ends as:** one PR to `main`, opened with `plot-open-pr.sh`. Do not merge it yourself.
- **Review of the code:** normal PR review; CI runs `ci.yml` and `bb-tests.yml` (Linux **and** macOS with `/bin/bash` 3.2)
- **Sprint:** `bb-pr-reads` (2026-10-26 to 2026-10-30), Must Have, release target 3.18.0

One slice, one wave. Nothing waits on this branch. `feature/bb-pr-list-pagination` runs at the same time in the same file; see the scope guard.

## What to build

`bb pr view <id> --json <fields>` answers `HTTP 404 — Resource not found` for a PR that exists. Reproduced 2026-10-23 with `cli/bb` 1.11.2 at `main`: `bb -R quatico/ewz-kus-portal pr view 3712 --json number,state`. In `cmd_pr_view` (`cli/bb:891`) the argument loop sets `pr_id="$1"` for every bare word, so the field list `number,state` replaces the id and the request goes to `/pullrequests/number,state`.

Build, in `cmd_pr_view`:

1. `--json [<fields>]` parsed like `cmd_pr_list` does (`cli/bb:810-818`): a bare word after `--json` that matches `^[a-zA-Z][a-zA-Z0-9,]*$` is the field list.
2. `--jq <expr>`, with the same `error: --jq requires --json` check as `pr list`.
3. Field projection through the existing `bb_pr_json_projection` (`cli/bb:483`), including `checks` through `bb_pr_attach_checks`.
4. A usage error for a non-numeric PR id, before any API call.
5. A usage error for `--comments` together with a field list.
6. Help text of `pr view`, and the `pr view` section of `skills/working-with-bitbucket-api/SKILL.md`.

The plan is canonical; this brief is orientation.

## Decisions the plan settles — do not re-derive them

**A numeric word after `--json` is the PR id, not a field list.** The field-list regex starts with a letter, so `bb pr view --json 42` keeps working. Do not add a lookahead or a "fields contain a comma" heuristic: `--json number` (one field, no comma) must project too.

**Reuse `bb_pr_json_projection`; do not copy its field table.** It emits `[.[] | { … }]` for an array. Wrap the single PR object (`[.] | <proj> | .[0]`), and run `bb_pr_attach_checks` on the same one-element array when `bb_pr_needs_checks` says so. Its comment (`cli/bb:479-482`) already says other `pr` subcommands reuse it. A second field table drifts from the first the next time a field is added.

**A non-numeric id fails before the request.** After this change, an HTTP 404 from `pr view` means the PR does not exist, and nothing else. That is the whole point of #97: the 404 was read as "deleted".

**`--comments --json <fields>` is a usage error, not a projection of `pr` only.** Comments have no field table, and a half-projected `{pr, comments}` object is a contract nobody asked for. A bare `--json --comments` keeps its current `{pr, comments}` output. Adding a gh-style `comments` field later does not break this.

**Rules this repo keeps re-learning:**
- Bash 3.2: no `declare -A`, no `${var^^}`, no `mapfile`; under `set -u`, expand a possibly-empty array as `${arr[@]+"${arr[@]}"}` (AGENTS.md Critical Rule 3). `bb_pr_json_projection` already follows this; keep it.
- Validate the field list before any API call — `pr list` does (`cli/bb:871`), and an unknown field must not cost a request.

## Done when

The plan's `### Verification` section is the specification:

- `tests/pr-view.test.ts` covers: a field list; `--jq`; `--json 42` keeps 42 as the id; an unknown field (error names the supported fields, no request sent); a non-numeric id (usage error, no request sent); `--comments` with a field list (usage error).
  - "No request sent" is the assertion a naive implementation passes without — assert the mock server recorded no call, not only the exit code.
  - `--json 42` catches a parser that treats every word after `--json` as fields.
- Live check, read-only, on `quatico/ewz-kus-portal`, from this branch's `cli/bb` (not the `bb` on `PATH`), once before the PR is marked ready. Paste the output into the PR description:
  - `bb pr view 3712 --json number,state` prints `{"number": 3712, "state": "MERGED"}`
  - `bb pr view 3488 --json number,state --jq .state` prints the state of a PR that looked deleted on 2026-10-23
  - `bb pr view abc --json number` fails with a usage error and sends no request

Plus the repo gates (AGENTS.md § Definition of Done): `pnpm test`, `pnpm run validate`, and `(cd skills/working-with-bitbucket-api/tests && pnpm test)`. Run all three before each push. Plot's `plot-local-checks.mjs` maps no command in this repo; use these instead. Add a changeset (`pnpm changeset`): root `patch`, `bumps:` → `working-with-bitbucket-api: patch`; indent `tuned-against:` by exactly two spaces if you add it. **Do not edit `BB_VERSION` in `cli/bb`** — the release commit bumps it.

## Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-open-pr.sh` (`--draft` while the work moves). Do not run `gh pr create`.
- When the PR exists, append `→ #<number>` to this branch's heading line in the plan's `## Slices` section.
- Commit style is Arlo's notation (`B - …` for this bug fix), per `skills/commit-notation/SKILL.md`.

## Scope guard

This branch owns `cmd_pr_view` in `cli/bb`, `tests/pr-view.test.ts`, the `pr view` part of `skills/working-with-bitbucket-api/SKILL.md`, and one changeset.

In flight at dispatch (2026-10-23): `feature/bb-pr-list-pagination` owns `bb_paginate`, `bb_pr_list_query`, `cmd_pr_list`, `tests/pr-list.test.ts` and `tests/.build/dev/mock-server.ts`. Do not touch those. Both branches edit `cli/bb` and `SKILL.md` in different functions and sections; the second PR to merge rebases.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
