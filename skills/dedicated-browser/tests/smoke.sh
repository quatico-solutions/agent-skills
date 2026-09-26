#!/usr/bin/env bash
set -euo pipefail

# End-to-end test for dedicated-browser on a real Mac. Not part of `pnpm test`: it needs a GUI
# session, Node 22+, the network, and downloads Chrome for Testing (about 150 MB, three times
# unless --quick).
#
#   tests/smoke.sh                 unattended: runs a patched COPY of the scripts that adds
#                                  --use-mock-keychain --password-store=basic, so no macOS
#                                  keychain prompt can block it. Everything else is the real code.
#   tests/smoke.sh --real-keychain run the scripts as shipped. A keychain prompt appears on the
#                                  first cookie write; a human must click Always Allow.
#   tests/smoke.sh --quick         skip the update-path steps (saves two downloads)
#
# Everything lives in a fresh temp directory on port 9444 (SMOKE_PORT to change it). Port 9222 is
# refused: it is the de facto default, and a browser somebody else uses may hold it. The test
# records who owns 9222 first and checks at the end that nothing changed.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_SCRIPTS="${HERE}/../scripts"

REAL_KEYCHAIN=false
QUICK=false
for arg in "$@"; do
  case "${arg}" in
    --real-keychain) REAL_KEYCHAIN=true ;;
    --quick) QUICK=true ;;
    *) echo "usage: smoke.sh [--real-keychain] [--quick]" >&2; exit 2 ;;
  esac
done

PORT="${SMOKE_PORT:-9444}"
DECOY_PORT=$((PORT + 1))
if [[ "${PORT}" == 9222 || "${DECOY_PORT}" == 9222 ]]; then
  echo "refusing to use port 9222" >&2
  exit 2
fi
command -v node >/dev/null || { echo "node is required" >&2; exit 2; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/dedicated-browser-smoke.XXXXXX")"
HOME_A="${TMP}/home-a"
HOME_B="${TMP}/home-b"
mkdir -p "${HOME_A}" "${HOME_B}"

# Which scripts run: the shipped ones, or a copy with the two mock-keychain flags added.
SCRIPTS="${SRC_SCRIPTS}"
if [[ "${REAL_KEYCHAIN}" == false ]]; then
  SCRIPTS="${TMP}/scripts"
  mkdir -p "${SCRIPTS}"
  cp "${SRC_SCRIPTS}/dedicated-browser" "${SRC_SCRIPTS}/backend-chrome.sh" "${SCRIPTS}/"
  awk '{ print } /--no-first-run \\$/ { print "    --use-mock-keychain \\"; print "    --password-store=basic \\" }' \
    "${SRC_SCRIPTS}/backend-chrome.sh" > "${SCRIPTS}/backend-chrome.sh"
  grep -q -- '--use-mock-keychain' "${SCRIPTS}/backend-chrome.sh" || { echo "could not patch the flags" >&2; exit 2; }
fi
CLI="${SCRIPTS}/dedicated-browser"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); echo "  ok    $1"; }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL  $1" >&2; }

db() { DEDICATED_BROWSER_HOME="${HOME_A}" DEDICATED_BROWSER_PORT="${PORT}" /bin/bash "${CLI}" "$@"; }
db_b() { DEDICATED_BROWSER_HOME="${HOME_B}" DEDICATED_BROWSER_PORT="${DECOY_PORT}" /bin/bash "${CLI}" "$@"; }
db_a_on_decoy_port() { DEDICATED_BROWSER_HOME="${HOME_A}" DEDICATED_BROWSER_PORT="${DECOY_PORT}" /bin/bash "${CLI}" "$@"; }

# Exit status of a command, without tripping set -e.
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
  if printf '%s' "${out}" | grep -q -F -- "${needle}"; then ok "${desc}"; else bad "${desc} (no '${needle}' in: ${out})"; fi
}

# A hung cookie call means a keychain prompt is waiting for a human.
cookie() { perl -e 'alarm 25; exec @ARGV' node "${HERE}/cookie.mjs" "${PORT}" "$1" 2>&1 || echo "hung-or-failed"; }

port_9222_owner() { lsof -nP -iTCP:9222 -sTCP:LISTEN -t 2>/dev/null | head -1 || true; }
OWNER_9222_BEFORE="$(port_9222_owner)"

cleanup() {
  db stop >/dev/null 2>&1 || true
  db_b stop >/dev/null 2>&1 || true
  # Only ever our own mktemp directory.
  case "${TMP}" in */dedicated-browser-smoke.*) rm -rf "${TMP}" ;; esac
}
trap cleanup EXIT

echo "dedicated-browser smoke test: port ${PORT}, temp ${TMP}"
if [[ "${REAL_KEYCHAIN}" == true ]]; then
  echo "REAL KEYCHAIN: a macOS prompt will appear. Click Always Allow when it does."
else
  echo "unattended: mock-keychain copy of the scripts. The keychain path itself is NOT covered."
fi

echo "1. setup, status, start"
expect_status 1 "status before setup: not installed" db status
expect_status 0 "setup installs and starts" db setup
expect_status 0 "status: running" db status
expect_output "already running" "second start is a no-op" db start
if curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/json/version" | grep -q '"Browser"'; then ok "debugging port answers"; else bad "debugging port answers"; fi
expect_output "pages:" "status lists pages" db status

echo "2. logins survive stop and start"
if [[ "$(cookie set)" == "set" ]]; then ok "cookie planted"; else bad "cookie planted (keychain prompt waiting?)"; fi
expect_status 0 "stop" db stop
expect_status 1 "status after stop: not running" db status
if curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then bad "port closed after stop"; else ok "port closed after stop"; fi
expect_status 0 "start again" db start
if [[ "$(cookie get)" == "survived" ]]; then ok "cookie survived stop/start"; else bad "cookie survived stop/start"; fi

echo "3. another browser on the port is not mistaken for ours"
# A second profile (home-b) answers on the decoy port; home-a must refuse to treat it as its own.
ln -s "${HOME_A}/Google Chrome for Testing.app" "${HOME_B}/Google Chrome for Testing.app"
expect_status 0 "decoy browser starts" db_b start
expect_status 2 "status refuses the decoy" db_a_on_decoy_port status
expect_status 1 "start refuses the decoy port" db_a_on_decoy_port start
expect_status 0 "decoy stops" db_b stop
expect_status 0 "real browser still reports running" db status

echo "4. behind-stable note"
printf '%s 999.0.0.1\n' "$(date +%s)" > "${HOME_A}/.latest-stable"
expect_output "behind the current stable 999" "status prints the update note" db status
expect_status 0 "the note does not change the exit status" db status
expect_status 1 "update refuses while the browser runs" db update
rm -f "${HOME_A}/.latest-stable"

if [[ "${QUICK}" == false ]]; then
  echo "5. update keeps the logins"
  expect_status 0 "stop before swapping the app" db stop
  STABLE_MAJOR="$(DEDICATED_BROWSER_HOME="${HOME_A}" /bin/bash -c ". '${SCRIPTS}/backend-chrome.sh'; backend_latest_version" | cut -d. -f1)"
  OLD_MAJOR=$((STABLE_MAJOR - 2))
  OLD_VERSION="$(curl -fsS --max-time 5 https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone.json \
    | tr -d '\n ' | sed -n "s/.*\"${OLD_MAJOR}\":{\"milestone\":\"${OLD_MAJOR}\",\"version\":\"\\([^\"]*\\)\".*/\\1/p")"
  if [[ -z "${OLD_VERSION}" ]]; then
    bad "look up an older version (milestone ${OLD_MAJOR})"
  else
    if DB_HOME="${HOME_A}" DB_PORT="${PORT}" DB_PROFILE="${HOME_A}/profile" \
      /bin/bash -c ". '${SCRIPTS}/backend-chrome.sh'; backend_install '${OLD_VERSION}'" >/dev/null 2>&1; then
      ok "installed older ${OLD_VERSION}"
    else
      bad "installed older ${OLD_VERSION}"
    fi
    expect_output "behind the current stable" "start notes it is behind (real lookup)" db start
    if [[ "$(cookie get)" == "survived" ]]; then ok "cookie present on the older build"; else bad "cookie present on the older build"; fi
    expect_status 0 "stop" db stop
    expect_status 0 "update" db update
    expect_status 0 "start on the new build" db start
    if [[ "$(cookie get)" == "survived" ]]; then ok "cookie survived the update"; else bad "cookie survived the update (keychain prompt after the update?)"; fi
    expect_status 0 "stop again" db stop
    expect_output "already current" "update again: already current" db update
  fi
fi

echo "6. port 9222 untouched"
if [[ "$(port_9222_owner)" == "${OWNER_9222_BEFORE}" ]]; then ok "port 9222 has the same owner as before"; else bad "port 9222 owner changed"; fi

echo
echo "passed ${PASS}, failed ${FAIL}"
[[ "${FAIL}" == 0 ]]
