#!/usr/bin/env bash
set -euo pipefail

# Runs tests/smoke.sh on a clean macOS virtual machine, so nothing on the host can make it pass or
# fail: no installed Chrome, no keychain item from an earlier run, no browser already on a port.
# Needs a Mac with Apple silicon and tart (https://tart.run, `brew install cirruslabs/cli/tart`).
#
#   tests/vm-smoke.sh [--keep] [smoke.sh options]
#
#   tests/vm-smoke.sh                      unattended run, mock-keychain copy of the scripts
#   tests/vm-smoke.sh --real-keychain --quick
#                                          the scripts as shipped, against the VM's fresh keychain.
#                                          Without --quick, step 6 fails: every update brings the
#                                          keychain prompt back, and nobody is there to click it.
#   tests/vm-smoke.sh --keep --quick       keep the VM afterwards, to look around in it
#
# Clones SMOKE_VM_IMAGE (default: Cirrus Labs' macOS Tahoe base image) into a throwaway VM, starts
# it without a window, copies this skill in and runs smoke.sh there through `tart exec`. The image
# logs its user in at boot, so the browser gets a real desktop session, and it ships Node. The VM is
# deleted at the end unless --keep is given. Screenshots from smoke.sh's Playwright step are copied
# to SMOKE_VM_ARTIFACTS (default: a new directory under $TMPDIR), and the path is printed.
#
# Disk: a clone shares its blocks with the image, but everything the VM writes lands on the host.
# The run refuses to start below SMOKE_VM_MIN_FREE_GB (default 10) free. When tart has no copy of
# the image yet, the clone first downloads it, about 25 GB.

IMAGE="${SMOKE_VM_IMAGE:-ghcr.io/cirruslabs/macos-tahoe-base:latest}"
MIN_FREE_GB="${SMOKE_VM_MIN_FREE_GB:-10}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VM="dedicated-browser-smoke-$$"

KEEP=false
SMOKE_ARGS=()
for arg in "$@"; do
  case "${arg}" in
    --keep) KEEP=true ;;
    *) SMOKE_ARGS+=("${arg}") ;;
  esac
done

command -v tart >/dev/null || { echo "tart is required: brew install cirruslabs/cli/tart" >&2; exit 2; }
[[ "$(uname -m)" == arm64 ]] || { echo "tart runs macOS VMs on Apple silicon only" >&2; exit 2; }
mkdir -p "${HOME}/.tart"
free_gb="$(df -g "${HOME}/.tart" | awk 'NR == 2 { print $4 }')"
if (( free_gb < MIN_FREE_GB )); then
  echo "only ${free_gb} GB free on the disk that holds ~/.tart; need ${MIN_FREE_GB} (SMOKE_VM_MIN_FREE_GB)" >&2
  exit 2
fi

TART_PID=""
# shellcheck disable=SC2329  # called by the EXIT trap
cleanup() {
  if [[ "${KEEP}" == true ]]; then
    echo "kept the VM: tart exec -it ${VM} zsh   (remove it: tart stop ${VM}; tart delete ${VM})"
    return
  fi
  tart stop "${VM}" >/dev/null 2>&1 || true
  [[ -n "${TART_PID}" ]] && wait "${TART_PID}" 2>/dev/null || true
  tart delete "${VM}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "vm-smoke: cloning ${IMAGE} into ${VM}"
tart clone "${IMAGE}" "${VM}"
tart run --no-graphics "${VM}" >/dev/null 2>&1 &
TART_PID=$!

echo "vm-smoke: waiting for the guest agent"
for _ in {1..60}; do
  tart exec "${VM}" true >/dev/null 2>&1 && break
  sleep 2
done
tart exec "${VM}" true >/dev/null 2>&1 || { echo "the VM did not come up within 2 minutes" >&2; exit 1; }

# Single quotes on purpose, here and below: the guest's shell expands these, not this one.
# shellcheck disable=SC2016
node_major="$(tart exec "${VM}" /bin/sh -c 'PATH="/opt/homebrew/bin:${PATH}" node --version' 2>/dev/null | sed -n 's/^v\([0-9]*\).*/\1/p')"
if [[ -z "${node_major}" ]] || (( node_major < 22 )); then
  echo "the image has no Node 22 or later, which smoke.sh needs (found: ${node_major:-none})" >&2
  exit 1
fi
echo "vm-smoke: guest macOS $(tart exec "${VM}" sw_vers -productVersion), Node ${node_major}"

# COPYFILE_DISABLE keeps macOS from adding ._ files to the archive.
COPYFILE_DISABLE=1 tar -C "${SKILL_DIR}" -cf - scripts tests \
  | tart exec -i "${VM}" /bin/sh -c 'mkdir -p ~/dedicated-browser && tar -C ~/dedicated-browser -xf -'

echo "vm-smoke: running smoke.sh ${SMOKE_ARGS[*]:-}"
status=0
# shellcheck disable=SC2016
tart exec "${VM}" /bin/bash -c 'export PATH="/opt/homebrew/bin:${PATH}" SMOKE_ARTIFACTS="${HOME}/smoke-artifacts"; cd ~/dedicated-browser && exec /bin/bash tests/smoke.sh "$@"' \
  smoke ${SMOKE_ARGS[@]+"${SMOKE_ARGS[@]}"} || status=$?

ARTIFACTS="${SMOKE_VM_ARTIFACTS:-$(mktemp -d "${TMPDIR:-/tmp}/dedicated-browser-vm-smoke.XXXXXX")}"
mkdir -p "${ARTIFACTS}"
if tart exec "${VM}" /bin/sh -c 'cd ~/smoke-artifacts 2>/dev/null && tar -cf - .' | tar -C "${ARTIFACTS}" -xf - 2>/dev/null; then
  echo "vm-smoke: screenshots in ${ARTIFACTS}"
else
  echo "vm-smoke: no screenshots came back from the VM" >&2
fi
exit "${status}"
