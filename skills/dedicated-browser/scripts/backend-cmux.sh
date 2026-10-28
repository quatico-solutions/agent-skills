#!/usr/bin/env bash
# cmux backend for dedicated-browser. Sourced by ./dedicated-browser, never run directly.
#
# The browser built into the cmux terminal, in a cmux browser profile that holds only the agent's
# logins. Each agent workspace gets one pane, a split beside the agent's terminal. cmux has no
# debugging port, so this backend replaces whole commands (backend_cmd_<command>) instead of
# answering backend-chrome.sh's seven questions, and the agent drives its pane with `run`.
#
# The caller sets SELF (the CLI's path), DB_HOME and DB_CMUX_PROFILE and defines
# cmux_profile_listed before sourcing. CMUX_WORKSPACE_ID comes from cmux.
#
# Two cmux facts shape everything here (README, "The cmux backend"):
#   - a pane opened without --profile opens in the last-used profile, so every open names ours;
#   - cmux does not say which profile a pane uses, so the panes this backend opened are recorded,
#     one "<workspace id> <surface id>" line each, in $DB_HOME/cmux/panes.

# shellcheck disable=SC2154 # SELF, DB_HOME and DB_CMUX_PROFILE are set by the CLI that sources this.
DBC_PANES="${DB_HOME}/cmux/panes"

backend_app_label() { printf 'cmux browser'; }

dbc_version() { cmux --version 2>/dev/null | awk '{ print $2 }'; }

# Exit 2, "do not use": the agent is not inside cmux, cmux does not answer, or its browser is off.
dbc_require_cmux() {
  local state
  if [[ -z "${CMUX_WORKSPACE_ID:-}" ]] || ! command -v cmux >/dev/null 2>&1; then
    echo "The cmux backend works only for an agent inside a cmux terminal (CMUX_WORKSPACE_ID is not set)." >&2
    echo "Do not use it from here. Without DEDICATED_BROWSER_BACKEND=cmux, the chrome backend is used." >&2
    return 2
  fi
  if ! state="$(cmux browser status 2>&1)"; then
    echo "cmux does not answer: ${state}" >&2
    return 2
  fi
  if [[ "${state}" != enabled ]]; then
    echo "cmux's browser is not enabled (cmux browser status: ${state}). Do not use it; tell the human." >&2
    return 2
  fi
}

dbc_pane_alive() { cmux browser --surface "$1" get url >/dev/null 2>&1; }

# Prints this workspace's pane when it is still open. Drops the records of panes that are gone.
dbc_current_pane() {
  local workspace pane kept="" found=""
  [[ -f "${DBC_PANES}" ]] || return 0
  while read -r workspace pane; do
    [[ -n "${pane:-}" ]] || continue
    dbc_pane_alive "${pane}" || continue
    kept="${kept}${workspace} ${pane}"$'\n'
    if [[ -z "${found}" && "${workspace}" == "${CMUX_WORKSPACE_ID}" ]]; then found="${pane}"; fi
  done < "${DBC_PANES}"
  printf '%s' "${kept}" > "${DBC_PANES}"
  printf '%s' "${found}"
}

dbc_last_used() {
  local list
  list="$(cmux browser profiles list 2>/dev/null)" || return 0
  printf '%s\n' "${list}" | awk -F'\t' '$3 ~ /last used/ { print $1 }'
}

# Opens the pane beside the agent's terminal, in our profile, without taking focus, and records it.
dbc_open_pane() {
  local out pane
  if ! out="$(cmux --id-format uuids browser open-split about:blank --profile "${DB_CMUX_PROFILE}" \
    --workspace "${CMUX_WORKSPACE_ID}" --focus false 2>&1)"; then
    echo "cmux could not open the pane: ${out}" >&2
    return 1
  fi
  pane="$(printf '%s' "${out}" | sed -n 's/.*surface=\([^ ]*\).*/\1/p')"
  if [[ -z "${pane}" ]]; then
    echo "cmux opened a pane but did not say which: ${out}" >&2
    return 1
  fi
  mkdir -p "${DB_HOME}/cmux"
  printf '%s %s\n' "${CMUX_WORKSPACE_ID}" "${pane}" >> "${DBC_PANES}"
  printf '%s' "${pane}"
}

# Opening our pane made our profile cmux's last-used one, and cmux opens a pane without an explicit
# profile in the last-used one: the human's next pane would land in the agent's profile. Opening a
# blank tab in the previous profile, in a workspace that never gets focus and is closed at once,
# makes that profile the last-used one again. Measured on cmux 0.65.2 with no change to focus or
# layout. `workspace create` prints a ref (OK workspace:<n>), not a UUID. Should the restore not
# take, the human is told instead.
dbc_after_open() {
  local before="$1" out workspace
  [[ -n "${before}" && "${before}" != "${DB_CMUX_PROFILE}" ]] || return 0
  if out="$(cmux workspace create --name dedicated-browser-restore --focus false 2>&1)"; then
    workspace="$(printf '%s' "${out}" | sed -n 's/.*\(workspace:[0-9][0-9]*\).*/\1/p' | sed -n 1p)"
    if [[ -n "${workspace}" ]]; then
      cmux browser open about:blank --profile "${before}" --workspace "${workspace}" --focus false >/dev/null 2>&1 || true
      cmux workspace close "${workspace}" >/dev/null 2>&1 || true
    fi
  fi
  [[ "$(dbc_last_used)" == "${before}" ]] && return 0
  echo "note: cmux now opens new browser panes in the agent's profile '${DB_CMUX_PROFILE}' until you pick another." >&2
  echo "      Anything you sign in to there, the agent can use. Pick your own profile when you open a pane." >&2
}

backend_cmd_setup() {
  dbc_require_cmux || return $?
  if cmux_profile_listed "${DB_CMUX_PROFILE}"; then
    echo "cmux browser profile '${DB_CMUX_PROFILE}' exists."
  elif cmux browser profiles add "${DB_CMUX_PROFILE}" >/dev/null; then
    echo "created cmux browser profile '${DB_CMUX_PROFILE}'"
  else
    echo "cmux could not create the browser profile '${DB_CMUX_PROFILE}'." >&2
    return 1
  fi
  backend_cmd_start || return $?
  cat <<EOF

The agent's browser is the pane beside this terminal, in the cmux browser profile '${DB_CMUX_PROFILE}'.
The agent drives it with '${SELF} run'; there is no MCP server to register.

In that pane:
  Sign in to the systems you want the agent to reach. Nothing else needs a login there.
  Everything signed in to in this profile is the agent's. Use another browser, or another cmux
  browser profile, for your own accounts.
EOF
}

backend_cmd_start() {
  local pane before
  dbc_require_cmux || return $?
  if ! cmux_profile_listed "${DB_CMUX_PROFILE}"; then
    echo "The cmux browser profile '${DB_CMUX_PROFILE}' does not exist. Run: DEDICATED_BROWSER_BACKEND=cmux ${SELF} setup" >&2
    return 1
  fi
  mkdir -p "${DB_HOME}/cmux"
  pane="$(dbc_current_pane)"
  if [[ -n "${pane}" ]]; then
    echo "already running: pane ${pane}, profile '${DB_CMUX_PROFILE}'"
    return 0
  fi
  before="$(dbc_last_used)"
  pane="$(dbc_open_pane)" || return 1
  dbc_after_open "${before}"
  echo "started: pane ${pane} beside this agent's terminal, profile '${DB_CMUX_PROFILE}'"
}

backend_cmd_status() {
  local pane url title
  dbc_require_cmux || return $?
  if ! cmux_profile_listed "${DB_CMUX_PROFILE}"; then
    echo "not set up. Run: DEDICATED_BROWSER_BACKEND=cmux ${SELF} setup" >&2
    return 1
  fi
  pane="$(dbc_current_pane)"
  if [[ -z "${pane}" ]]; then
    echo "not running in this workspace. Run: ${SELF} start" >&2
    return 1
  fi
  url="$(cmux browser --surface "${pane}" get url 2>/dev/null || true)"
  title="$(cmux browser --surface "${pane}" get title 2>/dev/null || true)"
  echo "running: cmux $(dbc_version), profile '${DB_CMUX_PROFILE}'"
  echo "pane: ${pane}"
  # Without query or fragment: they can carry tokens.
  echo "page: ${title}  <${url%%[?#]*}>"
}

backend_cmd_stop() {
  local pane
  dbc_require_cmux || return $?
  pane="$(dbc_current_pane)"
  if [[ -z "${pane}" ]]; then
    echo "not running"
    return 0
  fi
  cmux browser repl reset "dedicated-browser-${pane}" >/dev/null 2>&1 || true
  if ! cmux close-surface --surface "${pane}" >/dev/null 2>&1; then
    echo "cmux could not close the pane ${pane}." >&2
    return 1
  fi
  dbc_current_pane >/dev/null
  echo "stopped. Logins stay in the cmux browser profile '${DB_CMUX_PROFILE}'."
}

backend_cmd_update() {
  echo "cmux updates itself; there is nothing to update here."
}

# JavaScript run before every `run`, in the pane's own REPL session. It makes `page` the pane and
# turns the calls that would reach other tabs or other profiles into errors: tabs.open and
# tabs.content open tabs in whichever profile was used last, tabs.history is cmux's whole history,
# and tabs.use/get/list reach the human's tabs in every workspace. It guards against mistakes; it is
# no sandbox: code written to get around it can. The profile is the boundary. page.context() has no
# newPage and its pages() lists only the claimed pane (cmux 0.65.2), so it needs no guard. The
# JavaScript avoids "$" and backticks, because it sits in an unquoted heredoc.
dbc_pin_js() {
  local pane="$1"
  cat <<JS
if (globalThis.__dedicatedBrowserPane !== "${pane}") {
  const pane = "${pane}";
  const isPane = (t) => t === pane || (t != null && t.id === pane);
  const blocked = (name) => async () => {
    throw new Error("dedicated-browser: tabs." + name + " is blocked. Work in page, the agent's pane: a new tab would open in whichever cmux profile was used last.");
  };
  const notOurs = () => new Error("dedicated-browser: only the agent's pane " + pane + " is allowed; tabs.use and tabs.get of other tabs are blocked.");
  const use = tabs.use.bind(tabs);
  const get = tabs.get.bind(tabs);
  const list = tabs.list.bind(tabs);
  tabs.open = blocked("open");
  tabs.content = blocked("content");
  tabs.history = blocked("history");
  tabs.use = async (t) => { if (!isPane(t)) throw notOurs(); return use(t); };
  tabs.get = (t) => { if (!isPane(t)) throw notOurs(); return get(t); };
  tabs.list = async () => (await list()).filter((t) => t.id === pane);
  page = await use(pane);
  globalThis.__dedicatedBrowserPane = pane;
}
undefined
JS
}

backend_cmd_run() {
  local pane session code="" have_code=false
  local passthrough=()
  dbc_require_cmux || return $?
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --timeout | --max-output)
        [[ $# -ge 2 ]] || { echo "$1 needs a value." >&2; return 2; }
        passthrough+=("$1" "$2")
        shift 2
        ;;
      -)
        code="$(cat)"
        have_code=true
        shift
        ;;
      *)
        code="$1"
        have_code=true
        shift
        ;;
    esac
  done
  if [[ "${have_code}" == false || -z "${code}" ]]; then
    echo "usage: ${SELF} run '<js>'   or   ${SELF} run - < script.js   [--timeout <ms>] [--max-output <chars>]" >&2
    return 2
  fi
  pane="$(dbc_current_pane)"
  if [[ -z "${pane}" ]]; then
    echo "No agent pane in this workspace. Run: ${SELF} start" >&2
    return 1
  fi
  # One session per pane: a new pane after stop and start gets a fresh session and a fresh pin.
  session="dedicated-browser-${pane}"
  if ! dbc_pin_js "${pane}" | cmux browser repl --session "${session}" --workspace "${CMUX_WORKSPACE_ID}" --eval - >/dev/null 2>&1; then
    echo "Could not attach to the agent's pane ${pane}. Run: ${SELF} stop, then ${SELF} start" >&2
    return 1
  fi
  printf '%s\n' "${code}" | cmux browser repl --session "${session}" --workspace "${CMUX_WORKSPACE_ID}" \
    ${passthrough[@]+"${passthrough[@]}"} --eval -
}
