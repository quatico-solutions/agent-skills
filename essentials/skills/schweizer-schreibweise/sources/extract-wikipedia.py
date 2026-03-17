#!/usr/bin/env python3
"""Extract Helvetismen from the Wikipedia wikitext dump.

Reads wikipedia-helvetismen.json (MediaWiki API parse output), extracts
Swiss-German terms with their Standard German equivalents from the bullet-list
format, and writes wikipedia-helvetismen-extract.json.

Usage: python3 extract-wikipedia.py
"""
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IN_FILE = os.path.join(SCRIPT_DIR, "wikipedia-helvetismen.json")
OUT_FILE = os.path.join(SCRIPT_DIR, "wikipedia-helvetismen-extract.json")


def strip_wikitext(text):
    """Remove wikitext markup, returning plain text."""
    # Remove <ref>...</ref> and <ref ... />
    text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.DOTALL)
    text = re.sub(r"<ref[^>]*/\s*>", "", text)
    # Remove <nowiki /> and other HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Resolve [[link|display]] → display, [[link]] → link
    text = re.sub(r"\[\[([^|\]]*\|)?([^\]]*)\]\]", r"\2", text)
    # Remove remaining {{ }} templates
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    # Clean up whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_swiss_term(line):
    """Extract the Swiss term from a bullet line.

    Patterns handled:
    - ''term'' (standard italic)
    - ''[[term]]'' (linked italic)
    - der/die/das ''term'' (with article)
    """
    # Match the first italic term: ''...''
    m = re.search(r"''([^']+)''", line)
    if not m:
        return None
    term = m.group(1)
    term = strip_wikitext(term)
    # Strip leading articles
    term = re.sub(r"^(der|die|das|den|dem|des|ein|eine|einen|einem|eines)\s+", "", term)
    # Strip leading/trailing punctuation
    term = term.strip(" ,;:-–()")
    return term if term else None


def extract_de_de(line, swiss_term):
    """Extract the DE-DE equivalent from the parenthetical explanation.

    Typical patterns:
    - (DE-DE term)
    - (DE-DE term, other info)
    - ([[DE-DE term]])
    """
    # Remove the Swiss term part (everything up to and including the first parenthesis)
    # Look for parenthetical after the italic term
    cleaned = strip_wikitext(line)

    # Try to find text in parentheses
    paren_matches = re.findall(r"\(([^)]+)\)", cleaned)
    if paren_matches:
        # Take the first parenthetical that looks like a DE-DE equivalent
        for paren in paren_matches:
            # Skip parentheticals that are just clarifications
            paren_clean = paren.strip()
            if paren_clean and not paren_clean.startswith("Pl") and len(paren_clean) < 200:
                # Take the first comma-separated item as the main equivalent
                first_item = paren_clean.split(",")[0].split(";")[0].strip()
                # Strip articles
                first_item = re.sub(
                    r"^(der|die|das|den|dem|des|ein|eine|einen|einem|eines)\s+",
                    "",
                    first_item,
                )
                # Skip if it's just a description
                if len(first_item) > 1 and not first_item.startswith("in ") and not first_item.startswith("z."):
                    return first_item.strip(" ,;:-–")
    return ""


def main():
    if not os.path.exists(IN_FILE):
        print(f"Error: {IN_FILE} not found. Run update-sources.sh first.", file=sys.stderr)
        sys.exit(1)

    with open(IN_FILE) as f:
        data = json.load(f)

    wikitext = data["parse"]["wikitext"]["*"]

    # Split into sections by ==== headers ====
    sections = re.split(r"====\s*(.*?)\s*====", wikitext)
    # sections alternates: [preamble, header1, content1, header2, content2, ...]

    results = []
    current_category = "Allgemein"

    for i in range(1, len(sections), 2):
        current_category = sections[i].strip()
        content = sections[i + 1] if i + 1 < len(sections) else ""

        for line in content.split("\n"):
            line = line.strip()
            if not line.startswith("* "):
                continue

            swiss = extract_swiss_term(line)
            if not swiss:
                continue

            de_de = extract_de_de(line, swiss)
            results.append(
                {"swiss": swiss, "de_de": de_de, "category": current_category}
            )

    results.sort(key=lambda x: x["swiss"].lower())

    with open(OUT_FILE, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Stats
    categories = {}
    for r in results:
        categories[r["category"]] = categories.get(r["category"], 0) + 1

    print(f"Extracted {len(results)} entries → {OUT_FILE}")
    print(f"Categories:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
