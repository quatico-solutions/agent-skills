#!/usr/bin/env bash
# bump-skill-versions.sh — parse changeset bumps block, bump SKILL.md versions
# Must run BEFORE `changeset version` (which deletes changeset files)
# Called by: pnpm run version
#
# Reads structured YAML from HTML comments in changeset files:
#   <!--
#   bumps:
#     skills:
#       bye: patch
#       lab-notes: minor
#   -->
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGESET_DIR="$REPO_ROOT/.changeset"

source "$(dirname "$0")/lib.sh"

echo "Scanning changesets for skill version bumps..."

# Collect skill bumps from all pending changesets
# Format: SKILL_NAME:BUMP_TYPE (one per line)
#
# Deliberately a newline-separated list rather than an associative array: macOS ships
# bash 3.2, which has no `declare -A`, and maintainers run `pnpm run version` locally
# to check a changeset before pushing. CI runs on Linux and would never have caught it.
all_bumps=""

for cs_file in "$CHANGESET_DIR"/*.md; do
  [ ! -f "$cs_file" ] && continue
  basename_file="$(basename "$cs_file")"
  [[ "$basename_file" == "README.md" ]] && continue
  [[ "$basename_file" == "_template" ]] && continue

  # Extract YAML from <!-- bumps: ... --> HTML comment block
  # Uses awk to find content between <!-- and -->, then looks for skills: entries
  bumps_yaml=$(awk '
    /^<!--/  { in_comment=1; next }
    /^-->/   { in_comment=0; next }
    in_comment { print }
  ' "$cs_file")

  [ -z "$bumps_yaml" ] && continue

  # Parse "skills:" section — each line is "    skill-name: bump-type"
  in_skills=0
  while IFS= read -r line; do
    # Detect "skills:" section header
    if echo "$line" | grep -qE '^[[:space:]]*skills:[[:space:]]*$'; then
      in_skills=1
      continue
    fi
    # Detect other top-level keys (e.g., "agents:") — exit skills section
    if echo "$line" | grep -qE '^[[:space:]]{0,2}[a-z]'; then
      if [ $in_skills -eq 1 ] && ! echo "$line" | grep -qE '^[[:space:]]{4,}'; then
        in_skills=0
      fi
    fi
    # Parse skill entries (indented under skills:)
    if [ $in_skills -eq 1 ]; then
      skill=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*:.*//')
      bump=$(echo "$line" | sed 's/.*:[[:space:]]*//')
      if [ -n "$skill" ] && [ -n "$bump" ]; then
        all_bumps="${all_bumps}${skill}:${bump}"$'\n'
      fi
    fi
  done <<< "$bumps_yaml"
done

# Deduplicate: if the same skill appears in several changesets, keep the highest bump.
# One "skill:bump" line per skill. Skills are now applied in sorted order rather than the
# associative array's hash order — the resulting SKILL.md versions are unchanged, only the
# order of the progress lines, and sorted output is reproducible across runs.
#
# No `grep -v` in this pipeline on purpose: under `set -o pipefail` a grep that matches
# nothing exits 1 and takes the whole script with it, which is exactly the no-changesets
# case. Empty lines are skipped in the loop below instead.
skill_names="$(printf '%s' "$all_bumps" | cut -d: -f1 | sort -u)"

if [ -z "$skill_names" ]; then
  echo "  No skill version bumps found in changesets."
  exit 0
fi

resolved=""
while IFS= read -r skill; do
  [ -z "$skill" ] && continue
  best=""
  best_pri=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    [ "${line%%:*}" = "$skill" ] || continue
    bump="${line##*:}"
    pri=$(bump_priority "$bump")
    if [ -z "$best" ] || [ "$pri" -gt "$best_pri" ]; then
      best="$bump"
      best_pri="$pri"
    fi
  done <<< "$all_bumps"
  resolved="${resolved}${skill}:${best}"$'\n'
done <<< "$skill_names"

# Apply version bumps
while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  skill="${entry%%:*}"
  bump="${entry##*:}"
  skill_md="$REPO_ROOT/skills/$skill/SKILL.md"

  if [ ! -f "$skill_md" ]; then
    echo "  WARN: skill directory 'skills/$skill' not found — skipping"
    continue
  fi

  current=$(extract_version "$skill_md")
  if [ -z "$current" ]; then
    echo "  WARN: no metadata.version in $skill/SKILL.md — skipping"
    continue
  fi

  new_version=$(increment_semver "$current" "$bump")
  replace_version_in_frontmatter "$skill_md" "$current" "$new_version"
  echo "  ✓ $skill: $current → $new_version ($bump)"
done <<< "$resolved"

echo "Done bumping skill versions."
