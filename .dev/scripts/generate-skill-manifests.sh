#!/usr/bin/env bash
# generate-skill-manifests.sh — rebuild marketplace.json with per-skill entries
# Uses `skills ls --json` for canonical skill list, then reads metadata from SKILL.md
# Called by: sync-versions.sh (part of pnpm run version)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"

source "$(dirname "$0")/lib.sh"

PLUGIN_VERSION=$(jq -r '.version' "$REPO_ROOT/package.json")
AUTHOR_NAME=$(jq -r '.author.name // .author // "unknown"' "$REPO_ROOT/.claude-plugin/plugin.json")
AUTHOR_EMAIL=$(jq -r '.author.email // ""' "$REPO_ROOT/.claude-plugin/plugin.json")
COLLECTION_DESC=$(jq -r '.description' "$REPO_ROOT/.claude-plugin/plugin.json")

echo "Generating marketplace.json with per-skill entries..."

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

# Write back to marketplace.json, preserving top-level fields
jq --slurpfile p "$tmp_plugins" '.plugins = $p[0]' "$MARKETPLACE" > "${MARKETPLACE}.tmp"
mv "${MARKETPLACE}.tmp" "$MARKETPLACE"

count=$(jq '.plugins | length' "$MARKETPLACE")
echo "  ✓ marketplace.json: $count entries (1 collection + $((count - 1)) skills)"

rm -f "$tmp_plugins"
