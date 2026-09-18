#!/usr/bin/env bash
# bump-homebrew-formula.sh — push a formula bump branch to the Homebrew tap.
# Called by: create-release.sh, after the per-skill tags are pushed.
#
# Pushes only. A deploy key cannot open a pull request, so the tap's bump-pr
# workflow does that when the branch lands.
#
# This script never fails the release. The tags and the GitHub Release ARE the
# release; a tap one version behind still installs a working bb, while a release
# aborted halfway leaves tags pushed and no GitHub Release. Every give-up path
# below therefore prints what a human needs and exits 0.
#
# BUMP_DRY_RUN=1 prints the url and sha256 and stops before cloning.
set -uo pipefail

SKILL="working-with-bitbucket-api"
CLI_PATH="cli/bb"
TAP_SSH="git@github.com:quatico-solutions/homebrew-tap.git"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/lib.sh"

version="$(extract_version "$REPO_ROOT/skills/$SKILL/SKILL.md")"
if [ -z "$version" ]; then
  echo "  WARN: no version found in $SKILL/SKILL.md — skipping the formula bump"
  exit 0
fi

tag="${SKILL}@${version}"
url="https://raw.githubusercontent.com/quatico-solutions/agent-skills/${tag}/${CLI_PATH}"

echo "Bumping the Homebrew formula to ${version}..."

# Checksum the blob out of the tag this job just pushed, rather than fetching it
# back from raw.githubusercontent.com. raw serves the blob bytes verbatim, so the
# digests are identical — and this cannot fail because a CDN has not caught up in
# the seconds since `git push --tags`.
if ! git -C "$REPO_ROOT" cat-file -e "${tag}:${CLI_PATH}" 2>/dev/null; then
  echo "  WARN: ${tag} does not contain ${CLI_PATH} — skipping the formula bump"
  exit 0
fi
sha="$(git -C "$REPO_ROOT" show "${tag}:${CLI_PATH}" | shasum -a 256 | cut -d' ' -f1)"
echo "  url: $url"
echo "  sha256: $sha"

if [ -n "${BUMP_DRY_RUN:-}" ]; then
  echo "  DRY RUN — stopping before the clone"
  exit 0
fi

if [ -z "${TAP_DEPLOY_KEY:-}" ]; then
  echo "  WARN: TAP_DEPLOY_KEY not set — skipping the formula bump"
  echo "  Bump by hand in quatico-solutions/homebrew-tap with the url and sha256 above"
  exit 0
fi

key_file="$(mktemp)"
work="$(mktemp -d)"
# EXIT, not the end of the script: a failed clone or push must not leave a private
# key behind on the runner.
trap 'rm -rf "$work" "$key_file"' EXIT

printf '%s\n' "$TAP_DEPLOY_KEY" > "$key_file"
chmod 600 "$key_file"
export GIT_SSH_COMMAND="ssh -i $key_file -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

if ! git clone --depth 1 "$TAP_SSH" "$work"; then
  echo "  WARN: could not clone the tap — skipping the formula bump"
  exit 0
fi

branch="formula-bump/bb-${version}"
# Checked, because this script runs without `set -e` so that every give-up path
# can report and exit 0. An unchecked failure here would leave HEAD on the
# clone's main, commit there, and fail the push with a refspec error instead.
if ! git -C "$work" switch -c "$branch"; then
  echo "  WARN: could not create $branch in the clone — skipping the formula bump"
  exit 0
fi

formula="$work/Formula/bb.rb"
if [ ! -f "$formula" ]; then
  echo "  WARN: $formula does not exist — skipping the formula bump"
  exit 0
fi

# Assert each edit landed. `sed` exits 0 when its pattern matches nothing, so a
# change to the formula's line shape would silently edit neither line — and the
# `diff --quiet` below would then report "already at this version" and exit 0.
# That is a failure wearing a success message, and the release would stop
# bumping without anyone noticing. Grep for the values instead of trusting sed.
sed -E -i.bak "s|^  url \".*\"$|  url \"${url}\"|" "$formula"
sed -E -i.bak "s|^  sha256 \".*\"$|  sha256 \"${sha}\"|" "$formula"
rm -f "$formula.bak"

if ! grep -qF "  url \"${url}\"" "$formula"; then
  echo "  ERROR: the url line was not rewritten — the formula's shape has changed."
  echo "         Expected a line matching '  url \"...\"'. Bump by hand:"
  echo "           url    $url"
  echo "           sha256 $sha"
  exit 0
fi
if ! grep -qF "  sha256 \"${sha}\"" "$formula"; then
  echo "  ERROR: the sha256 line was not rewritten — the formula's shape has changed."
  echo "         Expected a line matching '  sha256 \"...\"'. Bump by hand:"
  echo "           url    $url"
  echo "           sha256 $sha"
  exit 0
fi

if git -C "$work" diff --quiet; then
  echo "  Formula already at ${version} — nothing to push"
  exit 0
fi

git -C "$work" -c user.name="quatico release bot" \
               -c user.email="noreply@quatico.com" \
               commit -am "D: bump bb to ${version}"

if git -C "$work" push origin "$branch"; then
  echo "  ✓ Pushed $branch — the tap opens the pull request"
else
  echo "  WARN: push to the tap failed — bump by hand with the url and sha256 above"
fi
exit 0
