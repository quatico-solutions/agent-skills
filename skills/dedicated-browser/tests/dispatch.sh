#!/usr/bin/env bash
set -euo pipefail

# Backend choice and command dispatch of the dedicated-browser CLI, with no browser: a copy of the
# scripts, a fake backend, and a stub `cmux` on PATH. Runs in about a second; needs no GUI.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_SCRIPTS="${HERE}/../scripts"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/dedicated-browser-dispatch.XXXXXX")"
cleanup() { case "${TMP}" in */dedicated-browser-dispatch.*) rm -rf "${TMP}" ;; esac; }
trap cleanup EXIT
mkdir -p "${TMP}/scripts" "${TMP}/bin" "${TMP}/home"
cp "${SRC_SCRIPTS}/dedicated-browser" "${SRC_SCRIPTS}/backend-chrome.sh" "${SRC_SCRIPTS}/backend-cmux.sh" "${TMP}/scripts/"

cat > "${TMP}/scripts/backend-fake.sh" <<'EOF'
backend_app_label() { printf 'Fake'; }
backend_cmd_status() { echo "fake status"; }
backend_cmd_run() { echo "fake run: $*"; }
EOF

# A cmux that lists two profiles and answers like an enabled browser; anything else fails.
cat > "${TMP}/bin/cmux" <<'EOF'
#!/bin/bash
case "$*" in
  "browser profiles list") printf 'default\tDefault\tAAAA (default)\ndb-dispatch\tdb-dispatch\tBBBB (last used)\n' ;;
  "browser status") echo enabled ;;
  *) echo "stub cmux: $*" >&2; exit 1 ;;
esac
EOF
chmod +x "${TMP}/bin/cmux"

CLI="${TMP}/scripts/dedicated-browser"
PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); echo "  ok    $1"; }
bad() { FAIL=$((FAIL + 1)); echo "  FAIL  $1" >&2; }
check() { # <description> <want> <got>
  if [[ "$3" == "$2" ]]; then ok "$1"; else bad "$1 (got '$3', wanted '$2')"; fi
}

# cli [NAME=value ...] <command> [args ...]: the CLI with a clean environment (no cmux workspace, no
# backend chosen, a temp home, an unused port), plus the leading NAME=value settings.
cli() {
  local settings=()
  while [[ $# -gt 0 && "$1" == *=* ]]; do
    settings+=("$1")
    shift
  done
  env -u CMUX_WORKSPACE_ID -u DEDICATED_BROWSER_BACKEND -u DEDICATED_BROWSER_CMUX_PROFILE \
    DEDICATED_BROWSER_HOME="${TMP}/home" DEDICATED_BROWSER_PORT=9447 ${settings[@]+"${settings[@]}"} \
    /bin/bash "${CLI}" "$@"
}
first_line() { local out; out="$("$@" 2>/dev/null || true)"; printf '%s' "${out%%$'\n'*}"; }
exit_of() { local s=0; "$@" >/dev/null 2>&1 || s=$?; echo "${s}"; }
in_cmux() { cli PATH="${TMP}/bin:${PATH}" CMUX_WORKSPACE_ID=W1 "$@"; }

echo "dispatch test"
check "outside cmux, the backend is chrome" "backend: chrome" "$(first_line cli status)"
check "chrome status, not installed, exits 1" 1 "$(exit_of cli status)"
check "inside cmux with the profile set up, the backend is cmux" "backend: cmux" \
  "$(first_line in_cmux DEDICATED_BROWSER_CMUX_PROFILE=db-dispatch status)"
check "inside cmux without the profile, the backend is chrome" "backend: chrome" \
  "$(first_line in_cmux DEDICATED_BROWSER_CMUX_PROFILE=nope status)"
check "DEDICATED_BROWSER_BACKEND wins over cmux" "backend: chrome" \
  "$(first_line in_cmux DEDICATED_BROWSER_CMUX_PROFILE=db-dispatch DEDICATED_BROWSER_BACKEND=chrome status)"
check "a backend's backend_cmd_status replaces the command" "fake status" \
  "$(cli DEDICATED_BROWSER_BACKEND=fake status 2>/dev/null | sed -n 2p)"
check "a backend's backend_cmd_run gets the arguments" "fake run: a b" \
  "$(cli DEDICATED_BROWSER_BACKEND=fake run a b 2>/dev/null)"
check "run with chrome exits 2" 2 "$(exit_of cli run '1')"
out="$(cli run '1' 2>&1 || true)"
case "${out}" in *mcp__dedicated-browser__*) ok "run with chrome names the MCP tools" ;; *) bad "run with chrome names the MCP tools (${out})" ;; esac
check "an unknown backend exits 2" 2 "$(exit_of cli DEDICATED_BROWSER_BACKEND=nope status)"
# setup never guesses: inside cmux with the profile set up, setup still takes chrome. Without npx on
# PATH, chrome's setup stops at its first check, before any download.
out="$(in_cmux DEDICATED_BROWSER_CMUX_PROFILE=db-dispatch PATH="${TMP}/bin:/usr/bin:/bin" setup 2>&1 || true)"
case "${out}" in *"npx is missing"*) ok "setup without the variable sets up chrome" ;; *) bad "setup without the variable sets up chrome (${out})" ;; esac

echo "passed ${PASS}, failed ${FAIL}"
[[ "${FAIL}" == 0 ]]
