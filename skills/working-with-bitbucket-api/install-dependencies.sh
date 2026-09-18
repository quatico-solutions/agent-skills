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
# The copy is STAGED, not deleted outright: it moves back on every path that ends the staging
# window without a bb in place — a brew error, a failed `remove_file`, Ctrl-C, a `set -e` abort,
# or a brew step that reported success without linking the keg. `trash`/`rm` touch the copy only
# after Homebrew's own symlink is verified, because that step is the unrecoverable one.
BIN_DIR="$(brew --prefix)/bin"
STAGED_COPY=""

# Put the staged copy back whenever the staging window ends with no bb at $BIN_DIR/bb. The
# window closes on any exit path — a failed `brew install`, remove_file's `exit 1`, Ctrl-C,
# any `set -e` abort — so the restore hangs off a trap rather than off one branch. STAGED_COPY
# is cleared once the copy is disposable, which is what stops the trap undoing a good install.
restore_staged_copy() {
    if [[ -z "$STAGED_COPY" || ! -e "$STAGED_COPY" || -e "$BIN_DIR/bb" ]]; then
        return 0
    fi
    if mv "$STAGED_COPY" "$BIN_DIR/bb"; then
        echo "bb: restored the pre-Homebrew copy to $BIN_DIR/bb — 'bb' keeps working."
    else
        echo "ERROR: could not restore the staged copy to $BIN_DIR/bb."
        echo "       It is at $STAGED_COPY — move it back by hand: mv '$STAGED_COPY' '$BIN_DIR/bb'"
    fi
}

on_interrupt() {
    trap - INT TERM
    echo ""
    echo "Interrupted."
    restore_staged_copy
    exit 130
}

trap restore_staged_copy EXIT
trap on_interrupt INT TERM

# Drop the staged copy after a verified install. A failure here leaves a stray temp file and
# nothing else, so it warns and continues — unlike remove_file, which stops the script.
discard_staged_copy() {
    if command -v trash &> /dev/null; then
        if trash "$1"; then
            echo "  staged copy moved to Trash: $1"
            return 0
        fi
    elif rm -f "$1"; then
        echo "  staged copy removed: $1"
        return 0
    fi
    echo "WARNING: could not remove the staged copy at $1."
    echo "         bb is installed and working; delete that leftover file when convenient."
}

if [[ -e "$BIN_DIR/bb" && ! -L "$BIN_DIR/bb" ]]; then
    # `.XXXXXX` keeps the template portable: GNU mktemp rejects one without it.
    STAGED_COPY="$(mktemp -t bb-pre-homebrew.XXXXXX)"
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
    if [[ -n "$STAGED_COPY" ]]; then
        # The keg was installed but unlinked: Homebrew refuses to link over a foreign file and
        # exits 0 anyway, so `brew list` succeeded while PATH still served the copy. The copy is
        # out of the way now, so link the keg — that is the whole reason for staging it.
        echo "bb: linking the Homebrew keg into $BIN_DIR..."
        brew link --overwrite "$FORMULA" || echo "WARNING: 'brew link --overwrite $FORMULA' failed."
    fi
else
    if ! brew install "$FORMULA"; then
        echo "ERROR: brew install failed."
        restore_staged_copy
        exit 1
    fi
fi

# The brew step reported success. Discard the staged copy only once Homebrew's own symlink is
# in place: brew exits 0 without linking, and until that link exists the staged copy is still
# the only bb on the machine.
if [[ -n "$STAGED_COPY" ]]; then
    if [[ -L "$BIN_DIR/bb" ]]; then
        staged="$STAGED_COPY"
        STAGED_COPY=""
        discard_staged_copy "$staged"
    else
        echo "WARNING: brew reported success but $BIN_DIR/bb is not a Homebrew symlink."
        echo "         Keeping the pre-Homebrew copy so 'bb' keeps working. To finish the"
        echo "         migration, run: brew link --overwrite \"$FORMULA\""
        restore_staged_copy
        STAGED_COPY=""
    fi
fi

# Verify. Use the absolute path: a bare `bb` runs whatever PATH resolves first — which,
# if the Homebrew prefix isn't on PATH yet, is nothing (exit 127, aborting here under
# `set -e` before ever reaching the PATH warning below), or, if a foreign `bb` sits
# earlier on PATH, that binary instead of the one just installed.
echo ""
echo "Verifying installation..."
if [[ ! -x "$BIN_DIR/bb" ]]; then
    echo "ERROR: $BIN_DIR/bb is missing after a successful brew step."
    echo "       Homebrew installed the keg without linking it. Link it, then re-run this script:"
    echo "         brew link --overwrite \"$FORMULA\""
    exit 1
fi
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
