#!/bin/bash
# Install working-with-bitbucket-api dependencies (macOS + Homebrew)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing working-with-bitbucket-api dependencies..."

# Homebrew (install target dir + jq)
if ! command -v brew &> /dev/null; then
    echo "ERROR: Homebrew is required (https://brew.sh) — it provides jq and the install dir \$(brew --prefix)/bin."
    exit 1
fi

# jq (JSON processor — used by bb for API response parsing)
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    brew install jq
else
    echo "jq: already installed ($(jq --version))"
fi

# perl + Unicode::Normalize (system-provided on macOS, used for NFC normalization in bb)
if perl -MUnicode::Normalize -e '1' 2>/dev/null; then
    echo "perl + Unicode::Normalize: available ($(perl -v | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1))"
else
    echo "ERROR: perl with Unicode::Normalize is required but not available"
    echo "  On macOS this ships with the system. Check your perl installation."
    exit 1
fi

# Install bb by COPY into Homebrew's bin — user-writable, no sudo, and on
# PATH for every Homebrew user (via brew shellenv). Not ~/bin (not on macOS
# default PATH) and not a symlink: skills live in version-based plugin cache
# dirs that vanish on update, so symlinks into them dangle. A copy can go
# stale instead — the skill's Step 0 version gate re-runs this installer.
BIN_DIR="$(brew --prefix)/bin"

# Clean up the legacy ~/bin/bb symlink from earlier skill versions
if [[ -L "$HOME/bin/bb" ]]; then
    echo "bb: removing legacy ~/bin/bb symlink..."
    trash "$HOME/bin/bb"
elif [[ -e "$HOME/bin/bb" ]]; then
    echo "WARNING: $HOME/bin/bb exists and is not a symlink — not touching it."
    echo "         If it shadows ${BIN_DIR}/bb on your PATH, remove it yourself."
fi

install -m 0755 "${SCRIPT_DIR}/bin/bb" "${BIN_DIR}/bb"
echo "bb: installed to ${BIN_DIR}/bb"

# Verify
echo ""
echo "Verifying installation..."
"${BIN_DIR}/bb" --version
resolved="$(command -v bb || true)"
if [[ "$resolved" != "${BIN_DIR}/bb" ]]; then
    echo "WARNING: 'bb' on PATH resolves to '${resolved:-nothing}', not ${BIN_DIR}/bb."
    echo "         Check your PATH order (is Homebrew's shellenv set up?)."
fi
"${BIN_DIR}/bb" auth status 2>/dev/null || echo "  (not logged in — run: bb auth login)"

echo ""
echo "All dependencies installed. Ready to use 'bb' CLI."
