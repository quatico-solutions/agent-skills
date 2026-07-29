#!/usr/bin/env bash
# generate-skill-manifests.sh — rebuild every marketplace.json with per-skill entries
# Uses `skills ls --json` for canonical skill list, then reads metadata from SKILL.md
# Called by: sync-versions.sh (part of pnpm run version)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Every marketplace manifest this repo ships. The generated `.plugins` array is
# identical for all of them — what differs is each file's own top-level fields
# (Cursor's has no `metadata` block, Claude's does), which are preserved.
#
# A missing file is skipped, not created: adding a marketplace is a deliberate
# act, and silently scaffolding one would ship a manifest nobody reviewed.
MARKETPLACES=(
  "$REPO_ROOT/.claude-plugin/marketplace.json"
  "$REPO_ROOT/.cursor-plugin/marketplace.json"
)

source "$(dirname "$0")/lib.sh"

PLUGIN_VERSION=$(jq -r '.version' "$REPO_ROOT/package.json")
AUTHOR_NAME=$(jq -r '.author.name // .author // "unknown"' "$REPO_ROOT/.claude-plugin/plugin.json")
AUTHOR_EMAIL=$(jq -r '.author.email // ""' "$REPO_ROOT/.claude-plugin/plugin.json")
COLLECTION_DESC=$(jq -r '.description' "$REPO_ROOT/.claude-plugin/plugin.json")

echo "Generating marketplace manifests with per-skill entries..."

# Start building the plugins array as a JSON file
tmp_plugins=$(mktemp)

# Entry [0]: full collection
jq -n --arg v "$PLUGIN_VERSION" --arg d "$COLLECTION_DESC" \
  --arg an "$AUTHOR_NAME" --arg ae "$AUTHOR_EMAIL" \
  '[{
    name: "quatico-skills",
    description: $d,
    version: $v,
    source: "./",
    author: { name: $an, email: $ae }
  }]' > "$tmp_plugins"

# Get canonical skill list from skills CLI
skill_json=$(cd "$REPO_ROOT" && pnpx skills ls --json 2>/dev/null || true)

if [ -z "$skill_json" ] || [ "$skill_json" = "[]" ]; then
  # Fallback: scan directories if CLI unavailable
  echo "  (skills CLI unavailable, scanning directories)"
  skill_json=$(
    for d in "$REPO_ROOT"/skills/*/; do
      [ ! -f "$d/SKILL.md" ] && continue
      n=$(basename "$d")
      printf '{"name":"%s","path":"%s"}\n' "$n" "$d"
    done | jq -s '.'
  )
fi

# Add per-skill entries
echo "$skill_json" | jq -r '.[] | "\(.name)\t\(.path)"' | while IFS=$'\t' read -r name skill_path; do
  [ -z "$name" ] && continue
  skill_md="$skill_path/SKILL.md"
  [ ! -f "$skill_md" ] && continue

  dir_name="$(basename "$skill_path")"

  # Read description (handles multi-line >- format)
  desc=$(extract_description "$skill_md")
  [ -z "$desc" ] && desc="Skill: $name"

  version=$(extract_version "$skill_md")
  [ -z "$version" ] && version="0.0.0"

  # Truncate description to 200 chars for marketplace brevity
  if [ ${#desc} -gt 200 ]; then
    desc="${desc:0:197}..."
  fi

  # Use directory name for source path (always correct)
  jq --arg n "$name" --arg d "$desc" --arg v "$version" \
    --arg s "./skills/$dir_name" --arg an "$AUTHOR_NAME" --arg ae "$AUTHOR_EMAIL" \
    '. + [{
      name: $n,
      description: $d,
      version: $v,
      source: $s,
      author: { name: $an, email: $ae }
    }]' "$tmp_plugins" > "${tmp_plugins}.new" && mv "${tmp_plugins}.new" "$tmp_plugins"
done

# Write back to each marketplace.json, preserving that file's top-level fields
written=0
for marketplace in "${MARKETPLACES[@]}"; do
  label="$(basename "$(dirname "$marketplace")")/$(basename "$marketplace")"

  if [ ! -f "$marketplace" ]; then
    echo "  – $label: not present, skipped"
    continue
  fi

  jq --slurpfile p "$tmp_plugins" '.plugins = $p[0]' "$marketplace" > "${marketplace}.tmp"
  mv "${marketplace}.tmp" "$marketplace"

  count=$(jq '.plugins | length' "$marketplace")
  echo "  ✓ $label: $count entries (1 collection + $((count - 1)) skills)"
  written=$((written + 1))
done

rm -f "$tmp_plugins"

# Every listed manifest missing is a broken release, not a quiet no-op: the
# published plugin would keep whatever versions it happened to have.
if [ "$written" -eq 0 ]; then
  echo "ERROR: no marketplace manifest was written — none of the listed files exist" >&2
  exit 1
fi
