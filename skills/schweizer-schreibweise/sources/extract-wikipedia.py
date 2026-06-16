#!/usr/bin/env python3
"""Document and validate the LLM-assisted Helvetismen extraction from Wikipedia.

The wikipedia-helvetismen-extract.json was produced by LLM subagents reading the
raw Wikipedia wikitext (wikipedia-helvetismen.json) and extracting structured data.
Regex-based extraction was abandoned because distinguishing "DE-DE equivalent" from
"description", "Austrian term", or "etymology note" in free-form prose requires
semantic comprehension, not pattern matching.

--- HOW THE JSON WAS PRODUCED ---

The raw wikitext (~78K chars, 14 sections, ~593 bullets) was split by ==== headers
and dispatched to four parallel LLM subagents, each handling 3-4 categories:

  Group 1: Küche, Nahrung, Restaurant / Haus, Haushalt / Handel, Gewerbe
  Group 2: Strassenverkehr / Schienenverkehr / Militär / Bildungswesen
  Group 3: Politik, Staat, Recht / Gesellschaft, Volkskultur / Natur/Geographie / Sport / Menschliches Verhalten / Gesundheitswesen
  Group 4: Anderes (the longest section, ~200 bullets of mixed content)

Each subagent was instructed to:
  - Extract the Swiss term from the first ''italic'' markup on each bullet
  - Identify the DE-DE equivalent from the parenthetical — NOT descriptions,
    NOT Austrian terms (Marille, Obers, Kren…), NOT etymologies, NOT examples
  - Resolve optional-letter notation: Billet(t) → Billett
  - Skip bibliography lines, phonology notes, and multi-term combined entries
  - Output JSON: [{"swiss": "...", "de_de": "...", "category": "..."}]

The four outputs were merged, deduplicated, and sorted alphabetically to produce
wikipedia-helvetismen-extract.json (337 entries).

--- TO REGENERATE ---

If the source Wikipedia article changes (update-sources.sh fetches fresh data):
1. Run update-sources.sh to refresh wikipedia-helvetismen.json
2. Split wikitext by ==== headers (see split_sections() below)
3. Feed each group to an LLM with the extraction prompt above
4. Merge the outputs and write wikipedia-helvetismen-extract.json

This script validates the existing JSON and shows extraction stats.

Usage: python3 extract-wikipedia.py
"""
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IN_FILE = os.path.join(SCRIPT_DIR, "wikipedia-helvetismen.json")
OUT_FILE = os.path.join(SCRIPT_DIR, "wikipedia-helvetismen-extract.json")


def split_sections(wikitext):
    """Split wikitext into (category, content) pairs by ==== headers."""
    parts = re.split(r"====\s*(.*?)\s*====", wikitext)
    sections = []
    for i in range(1, len(parts), 2):
        header = parts[i].strip()
        content = parts[i + 1] if i + 1 < len(parts) else ""
        bullet_count = sum(1 for line in content.split("\n") if line.strip().startswith("* "))
        sections.append((header, bullet_count))
    return sections


def validate_extract(entries):
    """Check the extracted JSON for obvious issues."""
    issues = []
    for i, e in enumerate(entries):
        if not e.get("swiss"):
            issues.append(f"Entry {i}: missing swiss term")
        if not e.get("category"):
            issues.append(f"Entry {i} ({e.get('swiss', '?')}): missing category")
        swiss = (e.get("swiss") or "").lower().strip()
        de_de = (e.get("de_de") or "").lower().strip()
        if swiss and de_de and swiss == de_de:
            issues.append(f"Entry {i}: same-term entry ({e['swiss']})")
        if de_de and ("&nbsp" in de_de or "''" in de_de or "[[" in de_de):
            issues.append(f"Entry {i} ({e.get('swiss', '?')}): wikitext debris in de_de: {de_de!r}")
    return issues


def main():
    if not os.path.exists(IN_FILE):
        print(f"Note: {IN_FILE} not found — run update-sources.sh to fetch raw Wikipedia data.")
    else:
        with open(IN_FILE) as f:
            data = json.load(f)
        wikitext = data["parse"]["wikitext"]["*"]
        sections = split_sections(wikitext)
        print(f"Source: {len(sections)} sections in wikipedia-helvetismen.json")
        for header, count in sections:
            print(f"  {header}: {count} bullets")

    if not os.path.exists(OUT_FILE):
        print(f"\nError: {OUT_FILE} not found.", file=sys.stderr)
        print("To regenerate: split wikitext by ==== headers and feed each group to an LLM.", file=sys.stderr)
        sys.exit(1)

    with open(OUT_FILE) as f:
        entries = json.load(f)

    print(f"\nExtract: {len(entries)} entries in wikipedia-helvetismen-extract.json")

    categories = {}
    for e in entries:
        cat = e.get("category", "?")
        categories[cat] = categories.get(cat, 0) + 1
    print(f"Categories ({len(categories)}):")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    issues = validate_extract(entries)
    if issues:
        print(f"\nValidation issues ({len(issues)}):")
        for issue in issues:
            print(f"  {issue}")
    else:
        print(f"\nValidation: OK — no issues found")


if __name__ == "__main__":
    main()
