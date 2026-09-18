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

# Remove a file, preferring the reversible option. Under `set -e`, a failing `trash`
# (or `rm`) must not abort silently — report it and stop, so the caller sees why.
remove_file() {
    if command -v trash &> /dev/null; then
        if trash "$1"; then
            echo "  moved to Trash: $1"
        else
            echo "ERROR: 'trash $1' failed — remove it manually, then re-run this script."
            exit 1
        fi
    else
        if rm -f "$1"; then
            echo "  removed: $1"
        else
            echo "ERROR: 'rm -f $1' failed — remove it manually, then re-run this script."
            exit 1
        fi
    fi
}

# Migration. Earlier versions of this skill COPIED bb into the Homebrew prefix and,
# before that, symlinked it into ~/bin. Homebrew refuses to link over a file it does
# not own, so the copy has to move out of the way before installing. A Homebrew-installed
# bb is a SYMLINK into the Cellar — that is how these two are told apart.
#
# The copy is STAGED, not deleted outright: if the install below fails (tap unreachable,
# network, any brew error), it moves back so the user is never left with no working `bb`
# at all — only `trash`/`rm` would make that unrecoverable, and only once install succeeds.
BIN_DIR="$(brew --prefix)/bin"
STAGED_COPY=""
if [[ -e "$BIN_DIR/bb" && ! -L "$BIN_DIR/bb" ]]; then
    STAGED_COPY="$(mktemp -t bb-pre-homebrew)"
    echo "bb: staging the pre-Homebrew copy at $BIN_DIR/bb (to $STAGED_COPY) while installing..."
    mv "$BIN_DIR/bb" "$STAGED_COPY"
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
    brew upgrade "$FORMULA" || echo "WARNING: upgrade failed — continuing with the installed version"
else
    if ! brew install "$FORMULA"; then
        echo "ERROR: brew install failed."
        if [[ -n "$STAGED_COPY" ]]; then
            echo "       Restoring the pre-Homebrew copy at $BIN_DIR/bb so 'bb' keeps working."
            mv "$STAGED_COPY" "$BIN_DIR/bb"
        fi
        exit 1
    fi
fi

# Install succeeded — the staged copy served its purpose.
if [[ -n "$STAGED_COPY" ]]; then
    remove_file "$STAGED_COPY"
fi

# Verify. Use the absolute path: a bare `bb` runs whatever PATH resolves first — which,
# if the Homebrew prefix isn't on PATH yet, is nothing (exit 127, aborting here under
# `set -e` before ever reaching the PATH warning below), or, if a foreign `bb` sits
# earlier on PATH, that binary instead of the one just installed.
echo ""
echo "Verifying installation..."
"$BIN_DIR/bb" --version
"$BIN_DIR/bb" auth status 2>/dev/null || echo "  (not logged in — run: bb auth login)"

echo ""
echo "All dependencies installed. Ready to use 'bb' CLI."

# Checked last, after the success message, so it isn't buried: does the shell's own PATH
# resolution agree with what was just verified above?
resolved="$(command -v bb || true)"
if [[ "$resolved" != "$BIN_DIR/bb" ]]; then
    echo ""
    echo "WARNING: 'bb' on PATH resolves to '${resolved:-nothing}', not $BIN_DIR/bb."
    echo "         Check your PATH order (is Homebrew's shellenv set up?)."
fi
