#!/usr/bin/env bash
# Chrome for Testing backend for dedicated-browser. Sourced by ./dedicated-browser, never run directly.
#
# A backend answers seven questions about "the agent's browser". The CLI holds no browser-specific
# knowledge of its own, so a second backend (Safari Technology Preview, say) is a sibling file
# named backend-<name>.sh that defines the same functions. See README.md, "Adding a backend".
#
#   backend_app_label            human-readable name, for messages
#   backend_installed_version    version of the installed app, empty if not installed
#   backend_latest_version       version the vendor currently ships as stable, non-zero if unknown
#   backend_install [VERSION]    install VERSION (default: latest) into $DB_HOME, replacing any older copy
#   backend_launch               start the browser detached, with the profile and debugging port
#   backend_quit                 ask the browser on the debugging port to quit the way its Quit menu does
#   backend_main_pids            pid of the running browser process for THIS profile, empty if none
#
# The caller sets DB_HOME (install dir), DB_PROFILE and DB_PORT before sourcing, and DB_COLOR (the
# theme color for a new profile, or "none") before backend_launch.

CFT_APP_NAME="Google Chrome for Testing.app"
CFT_INDEX_URL="https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json"
CFT_DOWNLOAD_BASE="https://storage.googleapis.com/chrome-for-testing-public"

backend_app_label() { printf 'Chrome for Testing'; }

backend_app_path() { printf '%s/%s' "${DB_HOME}" "${CFT_APP_NAME}"; }

# Read from Info.plist: does not start the browser, so it is safe while it is running.
backend_installed_version() {
  defaults read "$(backend_app_path)/Contents/Info" CFBundleShortVersionString 2>/dev/null || true
}

backend_latest_version() {
  local json
  json="$(curl -fsS --max-time 3 "${CFT_INDEX_URL}")" || return 1
  printf '%s' "${json}" | tr -d '\n' | sed -n 's/.*"Stable":{[^}]*"version":"\([^"]*\)".*/\1/p'
}

backend_platform() {
  case "$(uname -m)" in
    arm64) printf 'mac-arm64' ;;
    x86_64) printf 'mac-x64' ;;
    *) return 1 ;;
  esac
}

# Downloads the zip, unpacks it beside the destination (same volume, so the final move is atomic),
# clears the download quarantine flag and swaps it in. A failed download leaves any old copy alone.
backend_install() {
  local version="${1:-}" platform tmp app
  platform="$(backend_platform)" || { echo "Unsupported CPU: $(uname -m)" >&2; return 1; }
  if [[ -z "${version}" ]]; then
    version="$(backend_latest_version)" || { echo "Could not look up the current Chrome for Testing version (offline?)." >&2; return 1; }
  fi
  [[ -n "${version}" ]] || { echo "Could not read the current Chrome for Testing version." >&2; return 1; }

  mkdir -p "${DB_HOME}"
  tmp="$(mktemp -d "${DB_HOME}/.install.XXXXXX")"
  echo "Downloading Chrome for Testing ${version} (${platform}, about 150 MB)..." >&2
  if ! curl -fL --progress-bar -o "${tmp}/cft.zip" "${CFT_DOWNLOAD_BASE}/${version}/${platform}/chrome-${platform}.zip"; then
    rm -rf "${tmp}"
    echo "Download failed: ${CFT_DOWNLOAD_BASE}/${version}/${platform}/chrome-${platform}.zip" >&2
    return 1
  fi
  # ditto, not unzip: it keeps the symlinks and permissions inside the .app bundle intact.
  if ! ditto -x -k "${tmp}/cft.zip" "${tmp}/unpacked"; then
    rm -rf "${tmp}"
    echo "Could not unpack the download." >&2
    return 1
  fi
  app="${tmp}/unpacked/chrome-${platform}/${CFT_APP_NAME}"
  if [[ ! -d "${app}" ]]; then
    rm -rf "${tmp}"
    echo "The download did not contain ${CFT_APP_NAME}." >&2
    return 1
  fi
  xattr -cr "${app}" 2>/dev/null || true

  if [[ -d "$(backend_app_path)" ]]; then
    mv "$(backend_app_path)" "${tmp}/previous.app"
  fi
  if ! mv "${app}" "$(backend_app_path)"; then
    [[ -d "${tmp}/previous.app" ]] && mv "${tmp}/previous.app" "$(backend_app_path)"
    rm -rf "${tmp}"
    echo "Could not move the new copy into place." >&2
    return 1
  fi
  rm -rf "${tmp}"
  echo "Installed Chrome for Testing $(backend_installed_version) in ${DB_HOME}" >&2
}

# Chrome ignores a name it does not know, so a stale one only looks like it works. Each name is
# defined with BASE_FEATURE(k<Name>, ...) in the Chromium source at tag 155.0.8059.39.
# tests/feature-names.sh holds the source file of each name and repeats the check for any version:
# run it after a major update. A search for the name in the binary is no check. It finds strings
# that are no feature, and it misses a feature whose name comes from its C++ identifier.
#   MediaRouter                   no Cast device discovery on the local network, which can raise
#                                 macOS network prompts
#   OptimizationHints             no Optimization Guide downloads from Google
#   AutofillServerCommunication   no form-field lookups sent to Google's autofill server
#   AimEnabled                    no AI Mode button in the address bar
#   LensOverlay                   no Google Lens overlay or "Search with Lens" entry points
#   FedCm                         no browser "Sign in to <site> with <provider>" dialog; sites fall
#                                 back to their own sign-in pop-up or redirect, or offer none
CFT_DISABLED_FEATURES="MediaRouter,OptimizationHints,AutofillServerCommunication,AimEnabled,LensOverlay,FedCm"

# Chrome's own theme colors: the chips under "Pick a theme color" in chrome://settings/manageProfile.
# Prints the seed color (RRGGBB) and the color variant (1 tonal spot, 2 neutral) that
# kDynamicCustomizeChromeColors holds for a name at Chromium tag 155.0.8059.39.
CFT_THEME_COLORS="blue cool-grey grey aqua green viridian citron orange apricot rose pink fuchsia violet"
backend_theme_color() {
  case "$1" in
    blue) printf '8CABE4 1' ;;
    cool-grey) printf '8CABE4 2' ;;
    grey) printf '888888 2' ;;
    aqua) printf '26A69A 1' ;;
    green) printf '00FF00 1' ;;
    viridian) printf '87BA81 2' ;;
    citron) printf 'FADF73 1' ;;
    orange) printf 'FF8000 1' ;;
    apricot) printf 'FCDBC9 2' ;;
    rose) printf 'F3B2BE 1' ;;
    pink) printf 'F3B2BE 2' ;;
    fuchsia) printf 'FF00FF 1' ;;
    violet) printf 'E5D5FC 1' ;;
    *) return 1 ;;
  esac
}

# Settings written into the profile before each start, because no flag sets them. Chrome reads them
# at startup; a change the human makes in Settings is undone at the next start.
#   profile.password_manager_leak_detection = false   no "password found in a data breach" warnings;
#                                                      saving passwords still works
#   translate.enabled = false                         no "Translate this page?" bubble; Chromium has
#                                                      no feature named "Translate" since 138, so no
#                                                      --disable-features entry does this
#
# The theme color is different: it is written once, into a profile that does not exist yet, so the
# window of the agent's browser looks unlike the human's own. A color the human picks later in
# Chrome stays. The three settings are the ones Chrome writes when a person clicks that chip.
#   browser.theme.user_color2, .color_variant2        the seed color as a signed 32-bit ARGB number,
#                                                      and the variant
#   extensions.theme.id = "user_color_theme_id"       marks the theme as a color theme
backend_prepare_profile() {
  local prefs="${DB_PROFILE}/Default/Preferences" color="${DB_COLOR:-none}" seed="" variant=""
  if [[ ! -f "${prefs}" ]]; then
    # The name is checked before anything is written: a wrong name must not leave a profile behind
    # that the next start takes for an existing one.
    if [[ "${color}" != none ]]; then
      read -r seed variant <<< "$(backend_theme_color "${color}" || true)"
      if [[ -z "${seed}" ]]; then
        echo "Unknown color '${color}'. DEDICATED_BROWSER_COLOR takes one of: ${CFT_THEME_COLORS}, or none." >&2
        return 1
      fi
    fi
    mkdir -p "${DB_PROFILE}/Default"
    printf '{}\n' > "${prefs}"
  fi
  # JavaScript for Automation ships with macOS and parses Chrome's JSON exactly, nulls included.
  osascript -l JavaScript - "${prefs}" "${seed}" "${variant}" >/dev/null <<'JXA'
function run(argv) {
  ObjC.import('Foundation');
  const [path, seed, variant] = argv;
  const prefs = JSON.parse($.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null).js);
  prefs.profile = prefs.profile || {};
  prefs.translate = prefs.translate || {};
  let changed = false;
  if (seed) {
    prefs.browser = prefs.browser || {};
    prefs.browser.theme = Object.assign(prefs.browser.theme || {}, { user_color2: (0xff000000 | parseInt(seed, 16)) | 0, color_variant2: Number(variant) });
    prefs.extensions = prefs.extensions || {};
    prefs.extensions.theme = Object.assign(prefs.extensions.theme || {}, { id: 'user_color_theme_id' });
    changed = true;
  }
  if (prefs.profile.password_manager_leak_detection !== false) { prefs.profile.password_manager_leak_detection = false; changed = true; }
  if (prefs.translate.enabled !== false) { prefs.translate.enabled = false; changed = true; }
  if (!changed) return;
  $(JSON.stringify(prefs)).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
}
JXA
}

# The flag set never changes between launches. That matters for one flag in particular: a profile's
# saved logins are sealed with whichever password store was in effect, so switching later would
# make them look lost.
#
# The three frame-throttling flags: a window covered by another window makes macOS report it
# hidden; Chrome then stops firing animation frames and every Playwright click times out on
# "visible, enabled and stable" although the page is fine.
#
# --disable-popup-blocking lets sign-in pop-ups that a page opens from script, after a delay, work;
# a pop-up opened by a click works anyway, because Playwright's clicks count as user clicks.
# --disable-hang-monitor keeps the "Page unresponsive" dialog out of the agent's way; a page with a
# slow unload handler can then hold its tab open. --disable-breakpad, --disable-component-update
# (already Chrome for Testing's default), --disable-sync and --metrics-recording-only stop
# background work a person never sees. --allow-browser-signin=false turns off Chrome's own sign-in:
# no "Sign in to Chrome as ..." bubble after a Google login, no sync promos. Signing in to Google
# websites works as usual.
#
# Not here, on purpose:
#   --use-mock-keychain, --password-store=basic   the real keychain protects the cookies at rest
#   --disable-prompt-on-repost                    a reload would re-send a form without asking
#   --disable-background-networking,              Safe Browsing stays current while the profile
#   --disable-client-side-phishing-detection      holds live logins and the agent visits any site
#
# The browser starts through LaunchServices (`open`), as from the Dock, not as a child of this
# shell. macOS holds one process "responsible" for each program, and a program a shell starts
# inherits the terminal app as that process. Chrome uses Bluetooth only when the responsible
# process declares it (NSBluetoothAlwaysUsageDescription), and Terminal does not, so passkeys from
# a phone (QR code, which needs Bluetooth) were missing from the sign-in dialog. Chrome logs this in
# chrome://device-log as "Cannot use Bluetooth because the responsible app for the process does not
# have Bluetooth metadata". -n starts a new instance even when another Chrome for Testing runs.
backend_launch() {
  mkdir -p "${DB_PROFILE}"
  backend_prepare_profile
  open -n -a "$(backend_app_path)" --args \
    --remote-debugging-port="${DB_PORT}" \
    --user-data-dir="${DB_PROFILE}" \
    --no-first-run \
    --no-default-browser-check \
    --disable-search-engine-choice-screen \
    --disable-infobars \
    --disable-popup-blocking \
    --disable-hang-monitor \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-background-timer-throttling \
    --disable-breakpad \
    --disable-component-update \
    --disable-sync \
    --metrics-recording-only \
    --allow-browser-signin=false \
    --disable-features="${CFT_DISABLED_FEATURES}"
}

# Opening chrome://quit runs the same shutdown as the Quit menu item, and that writes cookies to
# disk. SIGTERM does not: Chrome writes new cookies on a 30-second timer, and on SIGTERM it lost a
# cookie set just before the stop in 15 of 17 runs. The debugging port's plain HTTP endpoint opens
# the page, so no websocket client is needed. The caller checks first that the port is ours.
backend_quit() {
  curl -fsS --max-time 3 -X PUT "http://127.0.0.1:${DB_PORT}/json/new?chrome://quit" >/dev/null 2>&1 || true
}

# Chrome's helper processes (renderer, GPU, ...) repeat --user-data-dir in their argv but carry
# --type=. The main process is the one without it. Matching the profile path, not the app, means
# another Chrome for Testing on the machine is never touched.
#
# With a PORT argument, only a process that was started with that debugging port counts. "Does
# this profile have a browser?" and "does that browser own this port?" are different questions:
# the second is what tells the dedicated browser from someone else's answering on the same port.
backend_main_pids() {
  local port="${1:-}" pattern='--user-data-dir='
  pattern="${pattern}${DB_PROFILE}"
  # shellcheck disable=SC2009  # pgrep -f takes a regex; a profile path needs a fixed-string match
  { ps -axww -o pid=,command= \
      | grep -F -- "${pattern}" \
      | grep -v -F -- '--type=' \
      | grep -v -F -- 'grep' \
      | if [[ -n "${port}" ]]; then grep -E -- "--remote-debugging-port=${port}( |\$)"; else cat; fi \
      | awk '{print $1}'; } || true
}
