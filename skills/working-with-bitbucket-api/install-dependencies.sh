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

# Symlink bb to ~/bin/ (on PATH)
mkdir -p ~/bin
if [[ -L ~/bin/bb ]]; then
    echo "bb: symlink exists, updating..."
    rm ~/bin/bb
fi
ln -s "${SCRIPT_DIR}/bin/bb" ~/bin/bb
echo "bb: symlinked to ~/bin/bb"

# Verify
echo ""
echo "Verifying installation..."
bb --version
bb auth status 2>/dev/null || echo "  (not logged in — run: bb auth login)"

echo ""
echo "All dependencies installed. Ready to use 'bb' CLI."
