#!/usr/bin/env bash
set -euo pipefail

# End-to-end test of the cmux backend. Run it inside a cmux terminal: it opens panes beside that
# terminal, never taking focus, in throwaway cmux browser profiles that it deletes at the end with
# their website data. Step 6c opens a pane in cmux's Default profile, the human's real one, and only
# on about:blank: no cookies, localStorage or logins go there. Needs Node for the local web app
# (cmux-app.mjs). Not part of `pnpm test`.
# A script inside cmux cannot quit cmux, so whether logins survive a cmux restart is checked by
# hand (README, "Testing").

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="${HERE}/../scripts/dedicated-browser"

if [[ -z "${CMUX_WORKSPACE_ID:-}" ]] || ! command -v cmux >/dev/null 2>&1; then
  echo "skip: run this inside a cmux terminal" >&2
  exit 0
fi
[[ "$(cmux browser status 2>/dev/null || true)" == enabled ]] || { echo "cmux's browser is not enabled" >&2; exit 2; }
command -v node >/dev/null || { echo "node is required" >&2; exit 2; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/dedicated-browser-smoke-cmux.XXXXXX")"
PROFILE="db-smoke-$$"
OTHER="db-smoke-other-$$"
APP_PORT="${SMOKE_APP_PORT:-9448}"
CHROME_PORT="${SMOKE_PORT:-9449}" # the chrome backend is only asked for its status; nothing listens here
APP="http://127.0.0.1:${APP_PORT}"
DATA="${HOME}/Library/WebKit/com.cmuxterm.app/WebsiteDataStore"
APP_PID=""
OTHER_PANE=""
WS2=""

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); echo "  ok    $1"; }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL  $1" >&2; }
status_of() { local s=0; "$@" >/dev/null 2>&1 || s=$?; echo "${s}"; }
expect_status() { # <expected> <description> <command...>
  local want="$1" desc="$2" got
  shift 2
  got="$(status_of "$@")"
  if [[ "${got}" == "${want}" ]]; then ok "${desc}"; else bad "${desc} (exit ${got}, wanted ${want})"; fi
}
expect_output() { # <fixed string> <description> <command...>
  local needle="$1" desc="$2" out
  shift 2
  out="$("$@" 2>&1 || true)"
  case "${out}" in *"${needle}"*) ok "${desc}" ;; *) bad "${desc} (no '${needle}' in: ${out})" ;; esac
}
expect_no_output() { # <fixed string> <description> <command...>
  local needle="$1" desc="$2" out
  shift 2
  out="$("$@" 2>&1 || true)"
  case "${out}" in *"${needle}"*) bad "${desc} ('${needle}' in: ${out})" ;; *) ok "${desc}" ;; esac
}
first_line() { local out; out="$("$@" 2>/dev/null || true)"; printf '%s' "${out%%$'\n'*}"; }

env_common=(DEDICATED_BROWSER_HOME="${TMP}/home" DEDICATED_BROWSER_PORT="${CHROME_PORT}" DEDICATED_BROWSER_CMUX_PROFILE="${PROFILE}")
db() { env "${env_common[@]}" DEDICATED_BROWSER_BACKEND=cmux /bin/bash "${CLI}" "$@"; }
db_auto() { env -u DEDICATED_BROWSER_BACKEND "${env_common[@]}" /bin/bash "${CLI}" "$@"; }
db_chrome() { env "${env_common[@]}" DEDICATED_BROWSER_BACKEND=chrome /bin/bash "${CLI}" "$@"; }
db_outside() { env -u CMUX_WORKSPACE_ID "${env_common[@]}" DEDICATED_BROWSER_BACKEND=cmux /bin/bash "${CLI}" "$@"; }
db_ws2() { env "${env_common[@]}" CMUX_WORKSPACE_ID="${WS2}" DEDICATED_BROWSER_BACKEND=cmux /bin/bash "${CLI}" "$@"; }
# Default mode: nothing set, as for an agent inside cmux that never ran setup. The same home as the
# opt-in runs above, so both modes' pane records share one file.
db_default() {
  env -u DEDICATED_BROWSER_BACKEND -u DEDICATED_BROWSER_CMUX_PROFILE DEDICATED_BROWSER_HOME="${TMP}/home" \
    DEDICATED_BROWSER_PORT="${CHROME_PORT}" /bin/bash "${CLI}" "$@"
}

profiles() { cmux browser profiles list 2>/dev/null || true; }
profile_names() { profiles | cut -f1 | sort; }
profile_uuid() { profiles | awk -F'\t' -v n="$1" '$1 == n { split($3, a, " "); print tolower(a[1]) }'; }
last_used() { profiles | awk -F'\t' '$3 ~ /last used/ { print $1 }'; }
focused() { local j; j="$(cmux identify --json --no-caller 2>/dev/null || true)"; printf '%s' "${j}" | sed -n 's/.*"surface_ref" : "\([^"]*\)".*/\1/p' | sed -n 1p; }
pane_text() { cmux browser --surface "$1" eval 'document.body.innerText' 2>&1 || true; }

PROFILES_BEFORE="$(profile_names)"
LAST_USED_BEFORE="$(last_used)"
FOCUSED_BEFORE="$(focused)"

cleanup() {
  local p uuid
  db stop >/dev/null 2>&1 || true
  db_default stop >/dev/null 2>&1 || true
  if [[ -n "${OTHER_PANE}" ]]; then cmux close-surface --surface "${OTHER_PANE}" >/dev/null 2>&1 || true; fi
  for p in "${PROFILE}" "${OTHER}"; do
    uuid="$(profile_uuid "${p}")"
    cmux browser profiles clear "${p}" --force >/dev/null 2>&1 || true
    cmux browser profiles delete "${p}" >/dev/null 2>&1 || true
    # cmux keeps a deleted profile's website data on disk (measured on 0.65.2). Remove this test's own only.
    if [[ -n "${uuid}" && -d "${DATA}/${uuid}" ]]; then rm -rf "${DATA:?}/${uuid}"; fi
  done
  if [[ -n "${WS2}" ]]; then cmux workspace close "${WS2}" >/dev/null 2>&1 || true; fi
  if [[ -n "${APP_PID}" ]]; then kill "${APP_PID}" 2>/dev/null || true; fi
  case "${TMP}" in */dedicated-browser-smoke-cmux.*) rm -rf "${TMP}" ;; esac
}
trap cleanup EXIT

echo "dedicated-browser cmux smoke test: profile ${PROFILE}, app port ${APP_PORT}, temp ${TMP}"
node "${HERE}/cmux-app.mjs" "${APP_PORT}" &
APP_PID=$!

echo "1. backend choice before setup"
if [[ "$(first_line db_auto status)" == "backend: cmux" ]]; then ok "inside cmux, before the opt-in profile exists, the backend is cmux"; else bad "inside cmux, before the opt-in profile exists, the backend is cmux"; fi
expect_status 1 "cmux forced, not set up: status exits 1" db status
expect_status 2 "cmux forced outside cmux: status exits 2" db_outside status

echo "2. setup, status, start"
expect_status 0 "setup" db setup
expect_output "${PROFILE}" "setup created the profile" profiles
# `profiles add` makes the new profile the last-used one, before start reads it.
if [[ "$(last_used)" == "${LAST_USED_BEFORE}" ]]; then ok "setup left the human's last-used profile as it was"; else bad "setup left the human's last-used profile as it was ($(last_used), was ${LAST_USED_BEFORE})"; fi
expect_status 0 "status: running" db status
expect_output "backend: cmux" "status names the backend" db status
expect_output "pane: " "status names the pane" db status
if [[ "$(first_line db_auto status)" == "backend: cmux" ]]; then ok "inside cmux with the profile, the backend is cmux"; else bad "inside cmux with the profile, the backend is cmux"; fi
if [[ "$(first_line db_chrome status)" == "backend: chrome" ]]; then ok "DEDICATED_BROWSER_BACKEND=chrome wins"; else bad "DEDICATED_BROWSER_BACKEND=chrome wins"; fi
expect_output "already running" "a second start is a no-op" db start
if [[ "$(focused)" == "${FOCUSED_BEFORE}" ]]; then ok "setup and start left the focus where it was"; else bad "setup and start moved the focus ($(focused), was ${FOCUSED_BEFORE})"; fi

echo "2b. a second agent workspace gets its own pane; the records do not clobber each other"
# `workspace create` prints a ref (OK workspace:<n>), not a UUID, even with --id-format uuids
# (cmux 0.65.2). cmux takes the ref wherever it takes a workspace id.
WS2="$(cmux workspace create --name db-smoke-ws2 --focus false 2>&1 | sed -n 's/.*\(workspace:[0-9][0-9]*\).*/\1/p' | sed -n 1p || true)"
if [[ -n "${WS2}" ]]; then ok "a second workspace"; else bad "a second workspace (no id from workspace create)"; fi
expect_status 0 "start in the second workspace" db_ws2 start
expect_status 0 "status in the second workspace" db_ws2 status
expect_status 0 "status in the first workspace: still running" db status
expect_status 0 "stop in the second workspace" db_ws2 stop
expect_status 0 "the first workspace's pane is untouched" db status
cmux workspace close "${WS2}" >/dev/null 2>&1 || true
WS2=""
if [[ "$(focused)" == "${FOCUSED_BEFORE}" ]]; then ok "the second workspace left the focus where it was"; else bad "the second workspace moved the focus"; fi

echo "3. run: cookies, localStorage, state between calls"
expect_output "signed in" "run: sign in on the local app" db run "await page.goto('${APP}/login'); await page.evaluate(() => document.body.innerText)"
expect_output "session=smoke" "run: the server gets the session cookie" db run "await page.goto('${APP}/whoami'); await page.evaluate(() => document.body.innerText)"
expect_output "session=smoke" "run: fetch() sends the pane's cookies" db run "await fetch('${APP}/whoami').then((r) => r.text())"
expect_output "kept" "run: localStorage" db run "await page.evaluate(() => { localStorage.setItem('smoke', 'kept'); return localStorage.getItem('smoke'); })"
db run 'const smokeValue = 41 + 1' >/dev/null 2>&1 || true
expect_output "42" "run: a top-level const lives on into the next call" db run 'smokeValue'
expect_output "session=smoke" "run: a script on stdin" db run - <<< "await page.goto('${APP}/whoami'); await page.evaluate(() => document.body.innerText)"
expect_status 1 "run: a script error exits 1" db run 'throw new Error("smoke")'

echo "4. the guards"
for call in "tabs.open('about:blank')" "tabs.content({ urls: ['${APP}/'] })" "tabs.history({})"; do
  expect_status 1 "run: ${call} fails" db run "await ${call}"
  expect_output "blocked" "run: ${call} says why" db run "await ${call}"
done

echo "5. profiles keep logins apart; pop-ups stay in the profile"
cmux browser profiles add "${OTHER}" >/dev/null
OTHER_PANE="$(cmux --id-format uuids browser open-split "${APP}/whoami" --profile "${OTHER}" --workspace "${CMUX_WORKSPACE_ID}" --focus false | sed -n 's/.*surface=\([^ ]*\).*/\1/p')"
sleep 2
expect_no_output "session=smoke" "a pane in another profile does not get the session cookie" pane_text "${OTHER_PANE}"
# Control first: a REPL session without the pin sees the other pane too, so the next check tests the
# pin. Labels, because the REPL's own "[ok | 1ms]" line would match a bare number.
expect_output "control: more than one tab" "an unpinned REPL session lists the other pane too" \
  cmux browser repl --session "db-smoke-unpinned-$$" "(await tabs.list({ all: true })).length > 1 ? 'control: more than one tab' : 'control: one tab'"
cmux browser repl reset "db-smoke-unpinned-$$" >/dev/null 2>&1 || true
expect_output "listed 1" "run: tabs.list({ all: true }) shows only the dedicated pane" db run "'listed ' + (await tabs.list({ all: true })).length"
expect_status 1 "run: tabs.use of another pane fails" db run "await tabs.use('${OTHER_PANE}')"
expect_output "session=smoke" "a pop-up opens in the agent's profile" db run "await page.goto('${APP}/popup'); const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('#open')]); await popup.waitForLoadState(); const text = await popup.evaluate(() => document.body.innerText); await popup.close(); text"

echo "6. stop and start"
cmux close-surface --surface "${OTHER_PANE}" >/dev/null 2>&1 || true
OTHER_PANE="$(cmux --id-format uuids browser open-split "${APP}/whoami" --profile "${OTHER}" --workspace "${CMUX_WORKSPACE_ID}" --focus false | sed -n 's/.*surface=\([^ ]*\).*/\1/p')"
expect_output "stopped" "stop" db stop
expect_status 1 "status after stop exits 1" db status
start_out="$(db start 2>&1 || true)"
case "${start_out}" in *"started"*) ok "start after stop" ;; *) bad "start after stop (${start_out})" ;; esac
if [[ "$(last_used)" == "${OTHER}" ]]; then ok "start restored the last-used profile"; else bad "start restored the last-used profile ($(last_used))"; fi
expect_output "session=smoke" "the session cookie survived stop and start" db run "await page.goto('${APP}/whoami'); await page.evaluate(() => document.body.innerText)"
expect_output "kept" "localStorage survived stop and start" db run "await page.goto('${APP}/'); await page.evaluate(() => localStorage.getItem('smoke'))"

echo "6b. after cmux restores the agent's pane, run and start put the human's profile back"
# When cmux reopens after a restart, it restores the agent's pane, and that makes the agent's
# profile the last-used one again while the pane is still open. A blank tab in the agent's profile,
# in a workspace of its own that is closed at once, does the same without a restart.
simulate_pane_restore() {
  local ws
  ws="$(cmux workspace create --name db-smoke-restore --focus false 2>&1 | sed -n 's/.*\(workspace:[0-9][0-9]*\).*/\1/p' | sed -n 1p || true)"
  [[ -n "${ws}" ]] || return 0
  cmux browser open about:blank --profile "${PROFILE}" --workspace "${ws}" --focus false >/dev/null 2>&1 || true
  cmux workspace close "${ws}" >/dev/null 2>&1 || true
}
simulate_pane_restore
if [[ "$(last_used)" == "${PROFILE}" ]]; then ok "simulated restore: the agent's profile is last used"; else bad "simulated restore: the agent's profile is last used ($(last_used))"; fi
db run '1' >/dev/null 2>&1 || true
if [[ "$(last_used)" == "${OTHER}" ]]; then ok "run put the human's last-used profile back"; else bad "run put the human's last-used profile back ($(last_used))"; fi
simulate_pane_restore
expect_output "already running" "start finds the pane" db start
if [[ "$(last_used)" == "${OTHER}" ]]; then ok "start put the human's last-used profile back"; else bad "start put the human's last-used profile back ($(last_used))"; fi
if [[ "$(focused)" == "${FOCUSED_BEFORE}" ]]; then ok "putting it back left the focus where it was"; else bad "putting it back moved the focus"; fi

echo "6c. Default mode: nothing set, cmux's Default profile, about:blank only"
# The opt-in pane stays open: Default mode must neither report it nor close it. The human's
# stand-in profile ${OTHER} is the last-used one, so opening in default has to put it back.
LAST_USED_6C="$(last_used)"
PROFILES_6C="$(profile_names)"
OPTIN_PANE="$(db status 2>/dev/null | sed -n 's/^pane: //p')"
default_backend="$(first_line db_default status)"
if [[ "${default_backend}" == "backend: cmux" ]]; then ok "Default mode: the backend is cmux"; else bad "Default mode: the backend is cmux (${default_backend})"; fi
expect_output "not running in this workspace" "Default mode: the opt-in pane does not count" db_default status
start_out="$(db_default start 2>&1 || true)"
DEFAULT_PANE="$(printf '%s' "${start_out}" | sed -n 's/^started: pane \([^ ]*\) .*/\1/p')"
if [[ -n "${DEFAULT_PANE}" && "${DEFAULT_PANE}" != "${OPTIN_PANE}" ]]; then ok "Default mode: start opens a pane of its own"; else bad "Default mode: start opens a pane of its own (${start_out})"; fi
expect_output "profile 'default'" "Default mode: status says profile 'default'" db_default status
expect_output "about:blank" "Default mode: run 'page.url()'" db_default run 'page.url()'
expect_status 1 "Default mode: run: tabs.open fails" db_default run "await tabs.open('about:blank')"
expect_output "blocked" "Default mode: run: tabs.open says why" db_default run "await tabs.open('about:blank')"
expect_output "pane: ${OPTIN_PANE}" "the opt-in mode still reports its own pane" db status
expect_output "stopped" "Default mode: stop" db_default stop
if [[ -n "${DEFAULT_PANE}" ]] && ! cmux browser --surface "${DEFAULT_PANE}" get url >/dev/null 2>&1; then ok "Default mode: stop closed its pane"; else bad "Default mode: stop closed its pane"; fi
expect_status 0 "Default mode's stop left the opt-in pane open" db status
# Only with the cmux backend: chrome's setup would download Chrome for Testing and bring it to the front.
if [[ "${default_backend}" == "backend: cmux" ]]; then
  setup_out="$(db_default setup 2>&1 || true)"
else
  setup_out="(not run: the backend is not cmux)"
fi
case "${setup_out}" in *"within any agent's reach"*) ok "Default mode: setup tells the human what agents reach" ;; *) bad "Default mode: setup tells the human what agents reach (${setup_out})" ;; esac
if [[ "$(profile_names)" == "${PROFILES_6C}" ]]; then ok "Default mode: setup creates no profile"; else bad "Default mode: setup creates no profile"; fi
expect_output "stopped" "Default mode: stop after setup" db_default stop
if [[ "$(last_used)" == "${LAST_USED_6C}" ]]; then ok "Default mode: the last-used profile is unchanged"; else bad "Default mode: the last-used profile is unchanged ($(last_used), was ${LAST_USED_6C})"; fi
if [[ "$(focused)" == "${FOCUSED_BEFORE}" ]]; then ok "Default mode left the focus where it was"; else bad "Default mode moved the focus"; fi

echo "7. run without a pane"
db stop >/dev/null 2>&1 || true
expect_status 1 "run with no pane exits 1" db run '1'
expect_output "start" "run with no pane says to start" db run '1'

cleanup
trap - EXIT
if [[ "$(profile_names)" == "${PROFILES_BEFORE}" ]]; then ok "the profiles are as before"; else bad "the profiles are as before"; fi
if [[ "$(focused)" == "${FOCUSED_BEFORE}" ]]; then ok "the focus is where it was"; else bad "the focus is where it was"; fi
echo "last used before: ${LAST_USED_BEFORE:-?}, after: $(last_used) (cmux falls back when a last-used profile is deleted)"

echo "passed ${PASS}, failed ${FAIL}"
[[ "${FAIL}" == 0 ]]
