# Juror verdict: script-caller contract

Plan: `docs/plans/2026-10-28-bb-scripted-calls.md` · Ticket: #111 · Lens: the author of scripts and skills that branch on `bb`'s stdout, stderr and exit status.

Position: amend
Evidence: ran

## What I ran

- `node --import tsx --test pr-list.test.ts` in `skills/working-with-bitbucket-api/tests`: 45/45 pass on `main`. `Fails after 5 retries and prints no rows` asserts `exitCode, 1` (pr-list.test.ts:677), so slice 1 changes that assertion on purpose.
- `/bin/bash` 3.2.57: `set -euo pipefail; f(){ return 4; }; g(){ local r; r="$(f)"; }; g` exits 4. A bare `x="$(bb_paginate …)"` under the script's `set -euo pipefail` (cli/bb:3) passes 4 through with no code change.
- `cli/bb` against a closed loopback port (`BB_API_URL=http://127.0.0.1:9`, dummy `BB_TOKEN`/`BB_EMAIL`, no network): `bb api /repositories/a/b` gives rc=0 with empty stdout. `bb pr list --json` and `bb pr list --state merged --all --json` give rc=0 with stdout `[]`. `bb source branches` gives rc=0 with `No branches found`. curl prints `curl: (7) …` on stderr only.
- `bb pr list --json --jq 'bad('` gives rc=3, and `--jq 'error("x")'` gives rc=5 (jq 1.8.2). bb already leaks jq's exit codes.

Everything else below comes from reading the code.

## 1. Does the Motivation hold?

Mostly. Claim by claim:

- "`bb_paginate` prints no rows and returns 1 after the fifth retry (`cli/bb:251`)". Holds: cli/bb:251-253.
- "`cmd_pr_list` exits 1". Holds: cli/bb:919 and :927 use `|| { rm -f …; exit 1; }`.
- "Exit 1 is also the status of every usage error and every other HTTP error". Holds for HTTP. **It understates the problem.** A transport failure (curl 6/7/28/35/52) gives `http_code` `000`. `000 -ge 400` is false, so `bb_paginate` and `bb_api_call` treat it as success. `bb` exits 0, and a `--json` listing prints `[]` (ran, see above). For a script that is a worse lie than the 429 case, and it is the same class of failure #111 describes ("exit status that looked like success").
- "The final line does not say how long to wait". Holds: cli/bb:252.
- "`bb_api_call` appends the path to the base with no separator". Holds: cli/bb:179 `"${BB_API}${path}"`. Plot's adapter documents the same fact (plot-host.sh:1028, "THE LEADING SLASH IS LOAD-BEARING").
- Help text quote. Holds: `cmd_api` help, "Paths are relative to https://api.bitbucket.org/2.0."

Open Point 2 ("the caller saw success, the code exits 1"): the transport-failure path is the only path I found that exits 0. It prints `[]`, not an empty file, so it does not explain #111's empty file either. The most likely explanation is still that the caller lost the 1. Run the reproduction the Open Point asks for.

## 2. Does each slice deliver #111's Expected criteria?

- **Slice 1, rate-limit exit.** #111 asks for a distinct non-zero code, one stderr line, `Retry-After` when present, empty stdout, and non-zero with no partial array on an `--all` walk that fails midway. The plan names all five. Two points are weaker than the ticket:
  - "One stderr line saying so": the five `bb: rate limited, retrying …` lines stay. That is acceptable because the ticket shows them as existing behaviour.
  - "How long Bitbucket asked to wait": the retry loop caps `Retry-After` at 60 (cli/bb:239). The plan does not say whether the final line reports the raw value or the capped one. For an hourly budget the raw value (e.g. 3600) is the useful fact. A capped "60 s" would mislead the caller.
- **Slice 2, `--head`.** #111 asks for repeatable `--head`, mapping to `source.branch.name`, combination with `--state`, and one request. The plan covers all four. The flag name and default (`OPEN`) match `gh pr list --head`, consistent with the skill README's "clone gh conventions" (README.md:16). A caller who wants the merged PR of a deleted branch must pass `--state merged`. The plan and the SKILL.md example should show that, because the ticket's own use case needs it.
- **Slice 3, api path.** #111 accepts either normalisation or a local refusal. The plan picks normalisation and gives a reason. Delivered.

## 3. What breaks?

- **Existing test:** pr-list.test.ts:677 (`exitCode, 1`) flips to 4. This is intended.
- **Callers in this repo:** none branch on `bb`'s exit status. `install-dependencies.sh:186` runs `bb auth status … || echo`, which `bb_paginate` does not reach. `handling-pull-requests`, `bye` and `working-with-bitbucket-web` use `bb` interactively. Nothing breaks.
- **Plot 2.29.0 (`plot-host.sh`):** Plot calls `bb api`, `bb pr view`, `bb pr merge`, `bb pr create` (without `--reviewer`) and `bb pr edit --body`. None of these reach `bb_paginate` today, so slice 1 changes no Plot path. Plot classifies `bb` failures **by stderr text, not by exit code**: `host_failure_kind` (plot-host.sh:780-785) maps `\b429\b|too many requests` to *secondary/burst* (exit 6) and `rate limit` to *throttled/quota spent* (exit 5). Today's line `error: rate limited after N rows` lands in *throttled*, which is correct. If the new line contains "429" or "Too Many Requests", Plot would read a spent hourly quota as a burst and tell the operator to "retry shortly". The plan's proposed wording is safe. Nothing in the plan pins that.
- **Plot's own exit 4:** Plot's contract is `4 = cannot be asked at all, do not retry` (plot-host.sh:3441-3450, "4 is the one code every caller reads as *this cannot be asked at all*"), and `host-shell.ts` reads it as `unaskable`. plot-host forwards `bb`'s raw status in several places: `bb "${args[@]}"` as the last command of `pr-create` (:4421) and `pr-merge` (:4451), `bb pr edit` (:5777), and `return $?` in the paged walks (:1175, :1363). Slice 1 does not reach these. Open Point 1's follow-up, "decide whether `bb_api_call` gets … exit 4", would reach them: a rate-limited `bb pr merge` would become Plot's "unaskable". The follow-up must account for this.
- **gh convention:** `gh help exit-codes` defines 4 as "command requires authentication". `bb` advertises gh conventions, so an agent that knows gh will read `bb` exit 4 as "run `bb auth login`". This is not a hard collision, because `bb` has never documented 4, but it is the one convention a gh-trained caller brings. `EX_TEMPFAIL` (75, sysexits.h) is the conventional "temporary failure, try again" code and collides with nothing. The ticket's "e.g. 4" is an example, not a requirement.
- **Exit codes bb already leaks:** jq 2/3/5 through `--jq` (ran). Exit 4 does not collide with jq, which uses 4 only under `-e`, and `bb` never passes `-e`. bb has no documented exit-code table today, so the plan's "Exit 4 means rate limited in `bb --help`" is the first documented code. That is good, but it documents 4 in isolation, while 3 and 5 can also occur.
- **bash 3.2:** no risk in the plan as written. `return 4` and errexit propagation through `x="$(…)"` work on 3.2.57 (ran). The new `--head` array must use the empty-safe expansion (`${arr[@]+"${arr[@]}"}`), as `add_reviewers` does at cli/bb:1319.

## 4. What the plan leaves the implementer to decide

1. **What "passed through by its callers" means at each site.** There are 16 `bb_paginate` call sites in cli/bb, in three groups:
   - **Passes 4 already** through errexit (10 sites): :1054, :1077, :1902, :1953, :2021, :2084, :2195, :2249, :2320, :2464.
   - **Collapses to 1 explicitly** (3 sites): :919 and :927 (`cmd_pr_list`, which the plan names), and :2651 (`download list`, `|| exit 1`, which the plan does not name).
   - **Swallows the failure** (2 sites): :141 and :149 in `bb_resolve_user`, with `|| prs="[]"`. A rate-limited reviewer lookup then sends a second request into the same limit and ends as `error: cannot resolve reviewer 'X'` with exit 1, through `obj="$(bb_resolve_user …)" || exit 1` at :1175 and :1321. That message tells the caller to fix the call, which is exactly the misreading #111 wants to end. `bb pr create --reviewer` and `bb pr edit --add-reviewer` are affected.

   The plan's "every other `bb_paginate` caller" does not say which group the swallowing sites join.
2. **The wording of the final line as a contract.** It must keep the substring `rate limited` and must not contain `429`, `Too Many Requests` or `secondary`, because Plot's classifier keys on that text.
3. **The raw or capped `Retry-After`, and its format.** Only the delta-seconds form is parsed today (cli/bb:238). An HTTP-date `Retry-After` falls back to the "line as today" form. That is acceptable, but the plan should say so.
4. **`--head` together with the `--author` fallback.** When an author query returns zero rows, cmd_pr_list:924 refetches with `bb_pr_list_query "$states" "" "$since"`. If `--head` is not threaded into that refetch, `--head X --author Y` with no match lists every PR of every branch. With `--all`, that is the full walk #111 wants to avoid. The heads argument must carry into the fallback.
5. **Quoting a branch name inside `q=`.** Git allows `"` in a ref name. The author list has the same gap today, so the plan inherits it rather than adding it. A one-line escape, or an explicit "not handled", settles it.
6. **Transport failures (exit 0, `[]`).** The plan neither fixes them nor scopes them out. A reader of a plan titled "`bb` tells a script what happened" will assume they are covered.
7. **Where callers find the code.** `bb --help` and SKILL.md:159 are named. `bb pr list --help` is where a script author looks for `pr list` behaviour, and it is not named.

## 5. Position and the smallest amendment

**Amend.** The three slices are sound, and slice 3 is ready as written. Slice 1's contract is under-specified for exactly the readers it serves. The smallest amendment that would move me to *proceed*:

1. In slice 1, list the three call-site groups from §4.1. State that :2651 passes 4, and that `bb_resolve_user` propagates 4 (no `|| prs="[]"` swallow on a 429) instead of reporting "cannot resolve reviewer".
2. Add one sentence: the final line keeps `error: rate limited after <n> rows`, reports `Retry-After` uncapped, and contains no `429`. Plot's `host_failure_kind` (plot-host.sh:780) classifies on that text.
3. Record the exit-code choice against gh's `4 = authentication required` (keep 4 with that reason, or use 75). Add to Open Point 1 that Plot reads 4 as *unaskable* and forwards `bb pr merge` / `pr create` / `pr edit` status raw.

Optional, not required for *proceed*: an Open Point for the transport-failure exit 0 (`http_code` `000`), and threading `--head` into the author fallback at cli/bb:924.

## Findings by severity

1. **High.** "Passed through by its callers" is undefined for 5 of 16 call sites. `bb_resolve_user` (:141, :149) swallows a 429 into "cannot resolve reviewer" with exit 1. `download list` (:2651) collapses to 1 and the plan does not name it.
2. **High (scope).** A transport failure exits 0 and prints `[]` from `pr list --json`, ran against a closed port. This is the silent-success class #111 is about, and the plan does not mention it.
3. **Medium.** Exit 4 means "authentication required" in gh, whose conventions `bb` claims to clone, and "unaskable, do not retry" in Plot, which forwards some `bb` statuses raw. Slice 1 breaks nothing today. Open Point 1's follow-up would.
4. **Medium.** The final stderr line is a de facto contract with Plot's text classifier, and the plan does not pin it. Adding "429" would reclassify a spent quota as a burst.
5. **Medium.** The `--head` and `--author` zero-row fallback (cli/bb:924) widens to every branch unless heads are threaded into it.
6. **Low.** The plan does not say whether `Retry-After` is reported raw or capped at 60, or how an HTTP-date form is handled.
7. **Low.** The plan does not show `--state merged` in the `--head` example for the ticket's own use case, the merged PR of a deleted branch.
8. **Low.** No exit-code table exists. jq's 3/5 already leak through `--jq`, so documenting only 4 leaves "any other non-zero" undefined.
