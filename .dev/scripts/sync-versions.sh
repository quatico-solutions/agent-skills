#!/usr/bin/env bash
# sync-versions.sh — propagate version from package.json to plugin metadata files
# Called automatically by `pnpm version` after `changeset version`
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION=$(jq -r '.version' "$REPO_ROOT/package.json")

echo "Syncing version $VERSION to plugin metadata files..."

sync_file() {
  local file="$1"
  local filter="$2"
  local tmp="${file}.tmp"
  jq --arg v "$VERSION" "$filter" "$file" > "$tmp" && mv "$tmp" "$file"
  echo "  ✓ $file"
}

sync_file "$REPO_ROOT/.claude-plugin/plugin.json"      '.version = $v'
sync_file "$REPO_ROOT/.cursor-plugin/plugin.json"       '.version = $v'

echo "Done. Plugin metadata files now at version $VERSION"

# Strip self-attribution from CHANGELOG ("Thanks @owner!" is noise when you're the sole author)
changelog="$REPO_ROOT/CHANGELOG.md"
if [ -f "$changelog" ]; then
  owner=$(jq -r '.changelog[1].repo // ""' "$REPO_ROOT/.changeset/config.json" | cut -d/ -f1)
  if [ -n "$owner" ]; then
    sed "s/ Thanks \[@${owner}\](https:\/\/github\.com\/${owner})!//g" "$changelog" > "${changelog}.tmp" && mv "${changelog}.tmp" "$changelog"
    echo "  ✓ Stripped self-attribution from CHANGELOG.md"
  fi
fi

# Keep bb's --version string in lockstep with its skill version (SKILL.md is
# bumped by bump-skill-versions.sh earlier in the `pnpm version` chain).
bb_skill="$REPO_ROOT/skills/working-with-bitbucket-api"
bb_version=$(grep -m1 -E '^\s*version:' "$bb_skill/SKILL.md" | sed -E 's/[^"]*"([^"]+)".*/\1/')
if [ -n "$bb_version" ]; then
  sed -E "s/^BB_VERSION=\"[^\"]*\"/BB_VERSION=\"${bb_version}\"/" "$bb_skill/bin/bb" > "$bb_skill/bin/bb.tmp" \
    && mv "$bb_skill/bin/bb.tmp" "$bb_skill/bin/bb" \
    && chmod +x "$bb_skill/bin/bb"
  echo "  ✓ bb --version → $bb_version"
fi

# Regenerate marketplace.json with per-skill entries (owns the entire .plugins array)
echo ""
bash "$(dirname "$0")/generate-skill-manifests.sh"
