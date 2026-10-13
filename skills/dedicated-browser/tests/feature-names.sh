#!/usr/bin/env bash
set -euo pipefail

# Checks that every name in CFT_DISABLED_FEATURES (scripts/backend-chrome.sh) is a feature in the
# Chromium source of one version. Chrome ignores a --disable-features name it does not know and
# prints nothing, so a name that Chromium removed keeps looking like it works. Needs the network
# and no browser. smoke.sh runs it for the version it installed.
#
#   tests/feature-names.sh            the current stable Chrome for Testing version
#   tests/feature-names.sh VERSION    that version, e.g. 155.0.8059.39
#
# Prints "ok <what>" or "FAIL <what>" per name and exits 1 if any failed.
#
# A feature is defined once, in one .cc file, and feature_file() records which. When Chromium
# moves a definition the check fails for that name although the feature still exists: search the
# Chromium source for BASE_FEATURE(k<Name> and update feature_file(). No match there means the
# name is gone, and it must leave CFT_DISABLED_FEATURES.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_BASE="https://raw.githubusercontent.com/chromium/chromium"

# shellcheck source-path=SCRIPTDIR source=../scripts/backend-chrome.sh
source "${HERE}/../scripts/backend-chrome.sh"

feature_file() {
  case "$1" in
    MediaRouter) printf 'chrome/browser/media/router/media_router_feature.cc' ;;
    OptimizationHints) printf 'components/optimization_guide/core/optimization_guide_features.cc' ;;
    AutofillServerCommunication) printf 'components/autofill/core/common/autofill_debug_features.cc' ;;
    AimEnabled) printf 'components/omnibox/browser/aim_eligibility_service_features.cc' ;;
    LensOverlay) printf 'components/lens/lens_features.cc' ;;
    FedCm) printf 'content/public/common/content_features.cc' ;;
    *) return 1 ;;
  esac
}

VERSION="${1:-}"
if [[ -z "${VERSION}" ]]; then
  VERSION="$(backend_latest_version)" || { echo "Could not look up the current Chrome for Testing version (offline?)." >&2; exit 1; }
fi
if [[ ! "${VERSION}" =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then
  echo "usage: feature-names.sh [VERSION]   e.g. 155.0.8059.39" >&2
  exit 2
fi

FAILED=0
ok() { echo "ok $1"; }
bad() { FAILED=$((FAILED + 1)); echo "FAIL $1"; }

IFS=',' read -r -a NAMES <<< "${CFT_DISABLED_FEATURES}"
for name in "${NAMES[@]}"; do
  if ! file="$(feature_file "${name}")"; then
    bad "${name}: feature_file() in tests/feature-names.sh records no source file for it"
    continue
  fi
  if ! source_text="$(curl -fsS --max-time 20 "${SOURCE_BASE}/${VERSION}/${file}" 2>/dev/null)"; then
    bad "${name}: could not read ${file} at tag ${VERSION}"
    continue
  fi
  # Two forms define a feature named <Name>: BASE_FEATURE(k<Name>, <default state>), where the name
  # comes from the identifier, and BASE_FEATURE(k<Name>, "<Name>", <default state>). The definition
  # can span lines, so the text is put on one line first. grep reads to the end of its input: with
  # -q it would stop at the match, and pipefail would turn that into a failure.
  if tr -s '[:space:]' ' ' <<< "${source_text}" \
    | grep -E "BASE(_RUNTIME_MUTABLE)?_FEATURE\( ?k${name} ?, ?([^\" ]|\"${name}\")" >/dev/null; then
    ok "${name} is a feature in Chromium ${VERSION}"
  else
    bad "${name} is not defined in ${file} at tag ${VERSION}: Chrome ignores the name"
  fi
done

[[ "${FAILED}" == 0 ]]
