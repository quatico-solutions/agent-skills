# `bb pr view --json <fields>` answers HTTP 404 for an existing PR

> `bb pr view 3712 --json number,state` sends `number,state` as the PR id and reports "Resource not found" for a PR that exists.

## Status

- **Phase:** Draft
- **Type:** bug
- **Issue:** #97
- **Sprint:** bb-pr-reads
- **Review:** in-session
- **Impl:** own branches
- **Rounds:** 2

## Changelog

- `bb pr view <id> --json <fields>` projects the named fields, the same set `bb pr list --json` supports, and `--jq <expr>` filters the result. Before, a field list made `bb pr view` answer HTTP 404.

## Motivation

`bb pr list` accepts `--json <fields>` and `--jq` since #18, so callers try the same form on `bb pr view`. The `pr view` argument loop treats every bare word as the PR id, so the field list overwrites the id and the request goes to `/pullrequests/number,state`. The 404 reads as "this PR does not exist": on 2026-10-23, PRs #3488–#3490 looked deleted until someone viewed them without `--json`. `cli/bb` 1.11.2 at `main` reproduces it the same day: `bb -R quatico/ewz-kus-portal pr view 3712 --json number,state` answers `HTTP 404 — Resource not found`.

## Design

### Approach

- In `cmd_pr_view` (`cli/bb`), parse `--json` like `cmd_pr_list` does: a bare word after `--json` that matches `^[a-zA-Z][a-zA-Z0-9,]*$` is the field list. A purely numeric word stays the PR id, so `bb pr view --json 42` keeps working.
- Add `--jq <expr>`, with the same "requires --json" check as `pr list`.
- Reuse `bb_pr_json_projection` for the field list. It emits `[.[] | {…}]` for arrays, so wrap the single PR object (`[.] | proj | .[0]`) instead of copying the field table. `checks` reuses `bb_pr_attach_checks` on the same one-element array.
- Reject a non-numeric PR id with a usage error before any API call. A 404 then only ever means the PR does not exist.
- `--comments` with a field list is a usage error. Fields project a PR, and comments have no field table. A bare `--json --comments` keeps its `{pr, comments}` output. A `comments` field in the gh style can be added later without breaking this contract.
- Update `pr view` help text and `skills/working-with-bitbucket-api/SKILL.md`.

### Verification

- **Mock suite:** `tests/pr-view.test.ts` covers a field list, `--jq`, `--json 42` (numeric word stays the id), an unknown field, a non-numeric id, and `--comments` with a field list. CI runs it on Linux and on macOS with bash 3.2.
- **Live check, read-only, on `quatico/ewz-kus-portal`:** once, before the PR is marked ready, from the branch's `cli/bb`. Each command is a single GET request. The output goes into the PR description.
  - `bb pr view 3712 --json number,state` prints `{"number": 3712, "state": "MERGED"}`
  - `bb pr view 3488 --json number,state --jq .state` prints the state of a PR that looked deleted on 2026-10-23
  - `bb pr view abc --json number` fails with a usage error and sends no request

### Open Points

- [x] `--comments --json <fields>`: rejected with a usage error.

## Branches

- `bug/bb-pr-view-json-fields` — field projection, `--jq`, and numeric-id check for `bb pr view`, with cases in `tests/pr-view.test.ts` <!-- builds: --json <fields> and --jq on cmd_pr_view, reusing bb_pr_json_projection -->

## Definition of Done

- [ ] `pnpm test` passes — skills parse
- [ ] `pnpm run validate` passes — skill frontmatter valid
- [ ] `bb` suite green on Linux **and** macOS/bash 3.2 — only if the diff touches `cli/bb`
- [ ] Changeset added with a `bumps:` block, and `tuned-against:` where the change is model-specific
- [ ] `README.md` skills table matches `skills/` — required when adding or removing a skill

## Notes

- Deliverable search: `bb_pr_json_projection` exists in `cli/bb:483` and is reused, not duplicated. Its comment already anticipates reuse by other `pr` subcommands.

<!-- CHALLENGE-THE-PLAN-METADATA
{
  "round": 2,
  "questionHistory": [
    {"q": "Live verification target?", "a": "quatico/ewz-kus-portal, read-only GETs, output in the PR", "category": "technical"},
    {"q": "bb pr view --comments --json <fields>: what does the field list apply to?", "a": "Reject the combination with a usage error", "category": "ux"}
  ],
  "deferredItems": [],
  "categoriesCovered": {
    "technical": {"stack": true, "architecture": true, "implementation": false},
    "domain": false,
    "ux": {"happyPath": true, "edgeCases": true, "errors": false, "accessibility": false},
    "nonFunctional": {"security": false, "performance": false, "scalability": false},
    "tradeOffs": false
  }
}
END-CHALLENGE-THE-PLAN-METADATA -->
