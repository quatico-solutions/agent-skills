#!/usr/bin/env python3
"""Extract Swiss-tagged terms from the OpenThesaurus MySQL dump.

Reads openthesaurus_dump.sql (from update-sources.sh), extracts the ~1,000
entries tagged 'schweizerisch' (tag 6) with their Standard German synonyms,
and writes openthesaurus-swiss-extract.json.

Usage: python3 extract-openthesaurus.py
"""
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SQL_FILE = os.path.join(SCRIPT_DIR, "openthesaurus_dump.sql")
OUT_FILE = os.path.join(SCRIPT_DIR, "openthesaurus-swiss-extract.json")
SWISS_TAG_ID = 6


def parse_values(text):
    """Parse MySQL VALUES string into list of field lists, handling escaped quotes."""
    rows = []
    i = 0
    while i < len(text):
        if text[i] == "(":
            fields = []
            i += 1
            while i < len(text) and text[i] != ")":
                if text[i] == "'":
                    i += 1
                    val = []
                    while i < len(text):
                        if text[i] == "'" and i + 1 < len(text) and text[i + 1] == "'":
                            val.append("'")
                            i += 2
                        elif text[i] == "\\" and i + 1 < len(text):
                            val.append(text[i + 1])
                            i += 2
                        elif text[i] == "'":
                            i += 1
                            break
                        else:
                            val.append(text[i])
                            i += 1
                    fields.append("".join(val))
                elif text[i] == ",":
                    i += 1
                    continue
                else:
                    j = i
                    while i < len(text) and text[i] not in (",", ")"):
                        i += 1
                    fields.append(text[j:i])
                if text[i : i + 1] == ",":
                    i += 1
            if text[i : i + 1] == ")":
                i += 1
            rows.append(fields)
        else:
            i += 1
    return rows


def main():
    if not os.path.exists(SQL_FILE):
        print(f"Error: {SQL_FILE} not found. Run update-sources.sh first.", file=sys.stderr)
        sys.exit(1)

    sql = open(SQL_FILE, "r", encoding="utf-8", errors="replace").read()

    # 1. Find Swiss-tagged term IDs from term_tag table
    swiss_ids = set()
    for m in re.finditer(r"INSERT INTO `term_tag` VALUES (.*?);", sql, re.DOTALL):
        for pair in re.findall(rf"\((\d+),{SWISS_TAG_ID}\)", m.group(1)):
            swiss_ids.add(int(pair))
    print(f"Swiss-tagged term IDs: {len(swiss_ids)}")

    # 2. Parse all terms
    term_section = re.search(r"INSERT INTO `term` VALUES (.*?);\nUNLOCK", sql, re.DOTALL)
    if not term_section:
        print("Error: could not find term table data.", file=sys.stderr)
        sys.exit(1)

    print("Parsing terms...")
    rows = parse_values(term_section.group(1))
    print(f"Total terms: {len(rows)}")

    # Index: id -> (synset_id, word, comment), synset_id -> [(id, word)]
    terms = {}
    synset_terms = {}
    for r in rows:
        if len(r) >= 9:
            tid, synset_id, word = int(r[0]), int(r[6]), r[8]
            comment = r[7] if r[7] != "NULL" else ""
            terms[tid] = {"synset_id": synset_id, "word": word, "comment": comment}
            synset_terms.setdefault(synset_id, []).append((tid, word))

    # 3. Build Swiss entries with their Standard German equivalents
    results = []
    for tid in sorted(swiss_ids):
        if tid not in terms:
            continue
        t = terms[tid]
        equivalents = [
            word
            for other_id, word in synset_terms.get(t["synset_id"], [])
            if other_id not in swiss_ids
        ]
        results.append({"swiss": t["word"], "equivalents": equivalents, "comment": t["comment"]})

    results.sort(key=lambda x: x["swiss"].lower())

    with open(OUT_FILE, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(results)} Swiss entries → {OUT_FILE} ({os.path.getsize(OUT_FILE)} bytes)")


if __name__ == "__main__":
    main()
