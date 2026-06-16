#!/bin/bash
# Install working-with-bitbucket-api dependencies (macOS + Homebrew)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing working-with-bitbucket-api dependencies..."

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

# Symlink bb to ~/bin/ (on PATH)
mkdir -p ~/bin
if [[ -e ~/bin/bb || -L ~/bin/bb ]]; then
    echo "bb: removing old ~/bin/bb..."
    trash ~/bin/bb
fi
ln -s "${SCRIPT_DIR}/bin/bb" ~/bin/bb
echo "bb: symlinked to ~/bin/bb"

# Verify
echo ""
echo "Verifying installation..."
~/bin/bb --version
~/bin/bb auth status 2>/dev/null || echo "  (not logged in — run: bb auth login)"

echo ""
echo "All dependencies installed. Ready to use 'bb' CLI."
