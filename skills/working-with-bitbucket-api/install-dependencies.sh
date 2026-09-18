#!/bin/bash
# Install working-with-bitbucket-api dependencies (macOS + Homebrew)
set -euo pipefail

FORMULA="quatico-solutions/tap/bb"

echo "Installing working-with-bitbucket-api dependencies..."

# Homebrew is an OFFICIAL dependency. It installs jq, owns the install directory,
# and keeps bb current through `brew upgrade`.
if ! command -v brew &> /dev/null; then
    echo "ERROR: Homebrew is required (https://brew.sh)."
    echo "       Install it, then re-run this script."
    exit 1
fi

# perl + Unicode::Normalize (system-provided on macOS, used for NFC normalization in bb).
# A formula cannot check this, so it stays here.
if perl -MUnicode::Normalize -e '1' 2>/dev/null; then
    echo "perl + Unicode::Normalize: available"
else
    echo "ERROR: perl with Unicode::Normalize is required but not available"
    echo "  On macOS this ships with the system. Check your perl installation."
    exit 1
fi

# Remove a file, preferring the reversible option.
remove_file() {
    if command -v trash &> /dev/null; then
        trash "$1" && echo "  moved to Trash: $1"
    else
        rm -f "$1" && echo "  removed: $1"
    fi
}

# Migration. Earlier versions of this skill COPIED bb into the Homebrew prefix and,
# before that, symlinked it into ~/bin. Homebrew refuses to link over a file it does
# not own, so the copy has to go first. A Homebrew-installed bb is a SYMLINK into the
# Cellar — that is how these two are told apart.
BIN_DIR="$(brew --prefix)/bin"
if [[ -e "$BIN_DIR/bb" && ! -L "$BIN_DIR/bb" ]]; then
    echo "bb: removing the pre-Homebrew copy at $BIN_DIR/bb..."
    remove_file "$BIN_DIR/bb"
fi

if [[ -L "$HOME/bin/bb" ]]; then
    echo "bb: removing the legacy ~/bin/bb symlink..."
    remove_file "$HOME/bin/bb"
elif [[ -e "$HOME/bin/bb" ]]; then
    echo "WARNING: $HOME/bin/bb exists and is not a symlink — not touching it."
    echo "         If it shadows $BIN_DIR/bb on your PATH, remove it yourself."
fi

# Install or upgrade. The name is fully qualified on purpose: it taps, trusts and
# installs in one step, and a bare `bb` would find an unrelated cask.
if brew list --formula "$FORMULA" &> /dev/null; then
    echo "bb: already installed — upgrading if a newer version exists..."
    brew upgrade "$FORMULA" || true
else
    brew install "$FORMULA"
fi

# Verify
echo ""
echo "Verifying installation..."
bb --version
resolved="$(command -v bb || true)"
if [[ "$resolved" != "$BIN_DIR/bb" ]]; then
    echo "WARNING: 'bb' on PATH resolves to '${resolved:-nothing}', not $BIN_DIR/bb."
    echo "         Check your PATH order (is Homebrew's shellenv set up?)."
fi
bb auth status 2>/dev/null || echo "  (not logged in — run: bb auth login)"

echo ""
echo "All dependencies installed. Ready to use 'bb' CLI."
