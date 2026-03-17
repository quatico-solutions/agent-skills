#!/usr/bin/env python3
"""Build the Helvetismen glossaries from extracted source data.

Merges OpenThesaurus Swiss-tagged terms, Wikipedia Helvetismen, and Wiktionary
validation data into two output files:
  - references/glossary.md      (~200 curated core business terms)
  - references/glossary-full.md (all ~1,200 merged entries)

Usage: python3 build-glossary.py

Inputs (in sources/):
  - openthesaurus-swiss-extract.json  (from extract-openthesaurus.py)
  - wikipedia-helvetismen-extract.json (from extract-wikipedia.py)
  - wiktionary-schweizer-hochdeutsch-1.json, -2.json (for validation)

Outputs (in references/):
  - glossary.md
  - glossary-full.md
"""
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REF_DIR = os.path.join(SCRIPT_DIR, "..", "references")

OT_FILE = os.path.join(SCRIPT_DIR, "openthesaurus-swiss-extract.json")
WP_FILE = os.path.join(SCRIPT_DIR, "wikipedia-helvetismen-extract.json")
WK_FILES = [
    os.path.join(SCRIPT_DIR, "wiktionary-schweizer-hochdeutsch-1.json"),
    os.path.join(SCRIPT_DIR, "wiktionary-schweizer-hochdeutsch-2.json"),
]

# ── Curated core terms ──────────────────────────────────────────────────────
# ~200 priority Swiss terms with correct DE-DE equivalents and categories.
# Selection criteria: business relevance, professional writing frequency,
# significant divergence from DE-DE (not just spelling variants).

CORE_TERMS = [
    # Handel, Gewerbe
    ("Angebot", "Offerte", "Handel, Gewerbe"),
    ("Zwangsvollstreckung", "Betreibung", "Handel, Gewerbe"),
    ("Einzelhandel", "Detailhandel", "Handel, Gewerbe"),
    ("Friseur", "Coiffeur", "Handel, Gewerbe"),
    ("Gebrauchtwarenladen", "Brockenhaus", "Handel, Gewerbe"),
    ("Scheck", "Check", "Handel, Gewerbe"),
    ("Pfand", "Depot", "Handel, Gewerbe"),
    ("Tarifvertrag", "Gesamtarbeitsvertrag (GAV)", "Handel, Gewerbe"),
    ("Tagesordnungspunkt", "Traktandum (Pl: Traktanden)", "Handel, Gewerbe"),
    ("offener Punkt", "Pendenz", "Handel, Gewerbe"),
    ("Kaufmannslehre", "KV", "Handel, Gewerbe"),
    ("Telefongesellschaft", "Fernmeldedienstanbieter (FDA)", "Handel, Gewerbe"),
    ("Handelskette", "Grossverteiler", "Handel, Gewerbe"),
    ("Überweisung", "Einzahlungsschein", "Handel, Gewerbe"),
    ("bewegliche Güter", "Fahrhabe", "Handel, Gewerbe"),
    ("Urlaub", "Ferien", "Handel, Gewerbe"),
    ("Eimer", "Kessel", "Handel, Gewerbe"),
    # Finanzen, Abrechnungswesen
    ("Anzahlung", "Akontozahlung", "Finanzen"),
    ("Steuererklärung", "Steuererklärung", "Finanzen"),
    ("Kontoauszug", "Kontoauszug", "Finanzen"),
    ("Gehalt", "Salär", "Finanzen"),
    ("Steuerveranlagung", "Veranlagung", "Finanzen"),
    ("Lohnabrechnung", "Lohnabrechnung", "Finanzen"),
    ("Voranschlag", "Budget", "Finanzen"),
    ("Rechnung", "Rechnung / Faktura", "Finanzen"),
    # Immobilien, Liegenschaftsverwaltung
    ("Hausmeister", "Hauswart", "Immobilien"),
    ("Dachboden", "Estrich", "Immobilien"),
    ("Erdgeschoss", "Parterre", "Immobilien"),
    ("Wohnung", "Wohnung", "Immobilien"),
    ("Mietvertrag", "Mietvertrag", "Immobilien"),
    ("Mieter", "Mieter", "Immobilien"),
    ("Stockwerk", "Stockwerk / Geschoss", "Immobilien"),
    ("Nebenkosten", "Nebenkosten", "Immobilien"),
    ("Liegenschaft", "Liegenschaft", "Immobilien"),
    ("Vermieter", "Vermieter", "Immobilien"),
    ("Gebäudeversicherung", "Gebäudeversicherung", "Immobilien"),
    # Strassenverkehr
    ("parken", "parkieren", "Strassenverkehr"),
    ("Bürgersteig", "Trottoir", "Strassenverkehr"),
    ("Fahrrad", "Velo", "Strassenverkehr"),
    ("Führerschein", "Führerausweis", "Strassenverkehr"),
    ("Nummernschild", "Kontrollschild", "Strassenverkehr"),
    ("Verkehrskreisel", "Kreisel", "Strassenverkehr"),
    ("Autobahn", "Autobahn / Autostrasse", "Strassenverkehr"),
    ("Leitplanke", "Leitplanke", "Strassenverkehr"),
    ("Motorhaube", "Motorhaube", "Strassenverkehr"),
    ("Strafzettel", "Busse", "Strassenverkehr"),
    ("Ampel", "Lichtsignal", "Strassenverkehr"),
    ("Maut", "Autobahnvignette", "Strassenverkehr"),
    ("Tankstelle", "Tankstelle", "Strassenverkehr"),
    ("Lastwagen", "Camion / Lastwagen", "Strassenverkehr"),
    ("Abschleppdienst", "Pannenhilfe", "Strassenverkehr"),
    # Schienenverkehr
    ("Fahrkarte", "Billett", "Schienenverkehr"),
    ("Bahnsteig", "Perron", "Schienenverkehr"),
    ("Schaffner", "Kondukteur", "Schienenverkehr"),
    ("Bahnübergang", "Bahnübergang / Niveauübergang", "Schienenverkehr"),
    ("Fahrplan", "Fahrplan / Kursbuch", "Schienenverkehr"),
    ("Abonnement", "Abonnement (Abo)", "Schienenverkehr"),
    ("Halbtax", "Halbtax", "Schienenverkehr"),
    ("Generalabonnement", "GA (Generalabonnement)", "Schienenverkehr"),
    ("Pendler", "Pendler", "Schienenverkehr"),
    # Politik, Staat, Recht
    ("Verordnung", "Reglement", "Politik, Staat, Recht"),
    ("Volksabstimmung", "Abstimmung / Volksabstimmung", "Politik, Staat, Recht"),
    ("Gemeinderat", "Gemeinderat", "Politik, Staat, Recht"),
    ("Stadtrat", "Stadtrat", "Politik, Staat, Recht"),
    ("Regierungsrat", "Regierungsrat", "Politik, Staat, Recht"),
    ("Bundesrat", "Bundesrat", "Politik, Staat, Recht"),
    ("Nationalrat", "Nationalrat", "Politik, Staat, Recht"),
    ("Ständerat", "Ständerat", "Politik, Staat, Recht"),
    ("Kanton", "Kanton", "Politik, Staat, Recht"),
    ("Verfügung", "Verfügung", "Politik, Staat, Recht"),
    ("Einsprache", "Einsprache", "Politik, Staat, Recht"),
    ("Volksinitiative", "Initiative", "Politik, Staat, Recht"),
    ("Referendum", "Referendum", "Politik, Staat, Recht"),
    ("Amtsblatt", "Amtsblatt", "Politik, Staat, Recht"),
    ("Botschaft (Bundesrat)", "Botschaft", "Politik, Staat, Recht"),
    ("Obligatorium", "Obligatorium", "Politik, Staat, Recht"),
    # Bildungswesen
    ("Abitur", "Matura / Maturität", "Bildungswesen"),
    ("Grundschule", "Primarschule", "Bildungswesen"),
    ("Gymnasium", "Gymnasium / Kantonsschule", "Bildungswesen"),
    ("Berufsschule", "Berufsschule / Gewerbeschule", "Bildungswesen"),
    ("Kindergarten", "Kindergarten", "Bildungswesen"),
    ("Zeugnis", "Zeugnis", "Bildungswesen"),
    ("Semesterferien", "Semesterferien", "Bildungswesen"),
    ("Hochschule", "Hochschule / ETH / Universität", "Bildungswesen"),
    ("Nachhilfe", "Nachhilfe / Stützunterricht", "Bildungswesen"),
    ("Klassenlehrer", "Klassenlehrer", "Bildungswesen"),
    # Arbeit, Beruf
    ("Bereitschaftsdienst", "Pikettdienst", "Arbeit, Beruf"),
    ("Überstunden", "Überzeit", "Arbeit, Beruf"),
    ("Arbeitszeugnis", "Arbeitszeugnis", "Arbeit, Beruf"),
    ("Kündigung", "Kündigung", "Arbeit, Beruf"),
    ("Stellensuche", "Stellensuche", "Arbeit, Beruf"),
    ("Bewerbung", "Bewerbung", "Arbeit, Beruf"),
    ("Probezeit", "Probezeit", "Arbeit, Beruf"),
    ("Mutterschaftsurlaub", "Mutterschaftsurlaub", "Arbeit, Beruf"),
    # Küche, Nahrung
    ("Speiseeis", "Glace", "Küche, Nahrung"),
    ("Sahne", "Rahm", "Küche, Nahrung"),
    ("Quark", "Quark", "Küche, Nahrung"),
    ("Brötchen", "Weggli / Brötli", "Küche, Nahrung"),
    ("Aprikose", "Aprikose / Barille", "Küche, Nahrung"),
    ("Blumenkohl", "Blumenkohl / Karfiol", "Küche, Nahrung"),
    ("Kartoffeln", "Kartoffeln / Härdöpfel", "Küche, Nahrung"),
    ("Marmelade", "Konfitüre", "Küche, Nahrung"),
    ("Kneipe", "Beiz", "Küche, Nahrung"),
    ("Kellnerin", "Serviertochter", "Küche, Nahrung"),
    ("Nudeln", "Teigwaren", "Küche, Nahrung"),
    ("Gulasch", "Voressen", "Küche, Nahrung"),
    ("Frühstück", "Morgenessen / Zmorge", "Küche, Nahrung"),
    ("Abendessen", "Nachtessen / Znacht", "Küche, Nahrung"),
    ("Schneebesen", "Schwingbesen", "Küche, Nahrung"),
    ("Müll", "Kehricht", "Küche, Nahrung"),
    # Haus, Haushalt
    ("Schrank", "Kasten", "Haus, Haushalt"),
    ("Steckdose", "Steckdose", "Haus, Haushalt"),
    ("Wandschrank", "Wandkasten", "Haus, Haushalt"),
    ("Wäscheständer", "Wäscheständer", "Haus, Haushalt"),
    ("Staubsauger", "Staubsauger", "Haus, Haushalt"),
    ("Wasserhahn", "Wasserhahn", "Haus, Haushalt"),
    ("Besen", "Besen", "Haus, Haushalt"),
    ("Abfalleimer", "Kehrichtsack", "Haus, Haushalt"),
    # Gesellschaft, Volkskultur
    ("Silvester", "Silvester", "Gesellschaft"),
    ("Feiertag", "Feiertag", "Gesellschaft"),
    ("Verein", "Verein", "Gesellschaft"),
    ("Trinkgeld", "Trinkgeld", "Gesellschaft"),
    ("Grillparty", "Grillieren / Grillparty", "Gesellschaft"),
    ("Wanderung", "Wanderung", "Gesellschaft"),
    # Gesundheitswesen
    ("Krankenkasse", "Krankenkasse", "Gesundheitswesen"),
    ("Krankenversicherung", "Krankenversicherung (KVG)", "Gesundheitswesen"),
    ("Rezept", "Rezept", "Gesundheitswesen"),
    ("Spital", "Spital", "Gesundheitswesen"),
    ("Apotheke", "Apotheke", "Gesundheitswesen"),
    ("Notaufnahme", "Notfall / Notaufnahme", "Gesundheitswesen"),
    ("Arztzeugnis", "Arztzeugnis", "Gesundheitswesen"),
    # Militär
    ("Militärdienst", "Militärdienst / Dienst", "Militär"),
    ("Zivilschutz", "Zivilschutz", "Militär"),
    ("Wiederholungskurs", "WK (Wiederholungskurs)", "Militär"),
    ("Rekrutenschule", "RS (Rekrutenschule)", "Militär"),
    # Verwaltung, Korrespondenz
    ("Anhang", "Beilage", "Verwaltung"),
    ("Protokoll", "Protokoll", "Verwaltung"),
    ("Sitzung", "Sitzung", "Verwaltung"),
    ("Einladung", "Einladung", "Verwaltung"),
    ("Beschluss", "Beschluss", "Verwaltung"),
    ("Weisung", "Weisung", "Verwaltung"),
    ("Vernehmlassung", "Vernehmlassung", "Verwaltung"),
    ("Bericht", "Bericht", "Verwaltung"),
    ("Aktennotiz", "Aktennotiz", "Verwaltung"),
    ("Visum (Genehmigung)", "Visum", "Verwaltung"),
    # Natur, Geographie
    ("Bach", "Bach", "Natur, Geographie"),
    ("Föhn", "Föhn", "Natur, Geographie"),
    ("Bise", "Bise", "Natur, Geographie"),
    ("Gletscher", "Gletscher", "Natur, Geographie"),
    # IT, Technik (modern usage)
    ("Handy", "Natel / Handy", "IT, Technik"),
    ("Computer", "Computer", "IT, Technik"),
    ("Drucker", "Drucker", "IT, Technik"),
    ("Passwort", "Passwort", "IT, Technik"),
]


def normalize(term):
    """Normalize a term for deduplication: lowercase, strip articles and parens."""
    t = term.lower().strip()
    t = re.sub(r"^(der|die|das|den|dem|des)\s+", "", t)
    t = re.sub(r"\s*\(.*?\)\s*", "", t)
    return t.strip()


def load_wiktionary_titles():
    """Load Wiktionary category members as a validation set."""
    titles = set()
    for wk_file in WK_FILES:
        if not os.path.exists(wk_file):
            continue
        with open(wk_file) as f:
            data = json.load(f)
        for member in data.get("query", {}).get("categorymembers", []):
            titles.add(normalize(member["title"]))
    return titles


def load_openthesaurus():
    """Load OpenThesaurus extract, creating DE-DE → Swiss mappings."""
    if not os.path.exists(OT_FILE):
        print(f"Warning: {OT_FILE} not found, skipping OpenThesaurus data.", file=sys.stderr)
        return {}
    with open(OT_FILE) as f:
        data = json.load(f)

    entries = {}
    for item in data:
        swiss = item["swiss"].strip()
        equivalents = [e.strip() for e in item.get("equivalents", []) if e.strip()]
        if swiss and equivalents:
            # Use first equivalent as primary DE-DE term
            de_de = equivalents[0]
            key = normalize(swiss)
            if key not in entries:
                entries[key] = {
                    "swiss": swiss,
                    "de_de": de_de,
                    "all_equivalents": equivalents,
                    "category": "Allgemein",
                    "source": "openthesaurus",
                }
    return entries


def load_wikipedia():
    """Load Wikipedia extract."""
    if not os.path.exists(WP_FILE):
        print(f"Warning: {WP_FILE} not found, skipping Wikipedia data.", file=sys.stderr)
        return {}
    with open(WP_FILE) as f:
        data = json.load(f)

    entries = {}
    for item in data:
        swiss = item["swiss"].strip()
        de_de = item.get("de_de", "").strip()
        category = item.get("category", "Allgemein").strip()
        key = normalize(swiss)
        if key and swiss:
            entries[key] = {
                "swiss": swiss,
                "de_de": de_de,
                "category": category,
                "source": "wikipedia",
            }
    return entries


def build_core_glossary():
    """Build the curated core glossary from CORE_TERMS."""
    # Group by category
    categories = {}
    for de_de, swiss, category in CORE_TERMS:
        # Skip entries where DE-DE and Swiss are the same (context terms)
        if normalize(de_de) == normalize(swiss):
            continue
        categories.setdefault(category, []).append((de_de, swiss))

    return categories


def is_valid_de_de(de_de):
    """Return True if the de_de field looks like a real German equivalent (not clarification text)."""
    if not de_de:
        return False
    # Skip entries that are clearly clarification text, not DE-DE equivalents
    noise_patterns = [
        r"^auch\s",           # "auch süddt.", "auch österr."
        r"^im\s",             # "im Deutschen: ..."
        r"^in\s[A-Z]",       # "in Deutschland: ..."
        r"^auf\s",            # "auf der ersten Silbe..."
        r"^Betonung\s",       # "Betonung auf..."
        r"^ursprünglich",     # "ursprünglich aus..."
        r"^dt\.\s*:",         # "dt.: ..."
        r"österr\.\s*:",      # "österr.: ..."
        r"^süddt\.",          # "süddt. auch"
        r"\bnicht:\s",        # "nicht: Flaschenpfand"
        r"^z\.\s*B\.",        # "z. B. ..."
        r"^Abk\.\s",          # abbreviation hints
        r"^Pl\.",              # plural forms
    ]
    for pattern in noise_patterns:
        if re.search(pattern, de_de):
            return False
    # Skip very long de_de (over 60 chars is likely a description, not a term)
    if len(de_de) > 60:
        return False
    return True


def build_full_glossary(ot_entries, wp_entries, wk_titles):
    """Merge all sources into a full glossary."""
    merged = {}

    # Start with Wikipedia (has categories)
    for key, entry in wp_entries.items():
        de_de = entry["de_de"]
        if not is_valid_de_de(de_de):
            de_de = ""
        merged[key] = {
            "swiss": entry["swiss"],
            "de_de": de_de,
            "category": entry["category"],
            "sources": ["wikipedia"],
            "wiktionary_confirmed": key in wk_titles,
        }

    # Merge OpenThesaurus
    for key, entry in ot_entries.items():
        if key in merged:
            # Supplement: prefer Wikipedia category, fill in de_de if missing
            existing = merged[key]
            existing["sources"].append("openthesaurus")
            if not existing["de_de"] and entry["de_de"]:
                existing["de_de"] = entry["de_de"]
        else:
            merged[key] = {
                "swiss": entry["swiss"],
                "de_de": entry["de_de"],
                "category": entry.get("category", "Allgemein"),
                "sources": ["openthesaurus"],
                "wiktionary_confirmed": key in wk_titles,
            }

    # Override with curated core data where available
    for de_de, swiss, category in CORE_TERMS:
        key = normalize(swiss)
        if key in merged:
            merged[key]["de_de"] = de_de
            merged[key]["category"] = category

    # Group by category
    categories = {}
    for entry in merged.values():
        if not entry["de_de"]:
            continue
        cat = entry["category"]
        categories.setdefault(cat, []).append((entry["de_de"], entry["swiss"]))

    return categories, len(merged)


def write_glossary(categories, filepath, title_suffix=""):
    """Write a categorized glossary Markdown file."""
    # Sort categories, putting major ones first
    category_order = [
        "Handel, Gewerbe",
        "Finanzen",
        "Immobilien",
        "Strassenverkehr",
        "Schienenverkehr",
        "Politik, Staat, Recht",
        "Bildungswesen",
        "Arbeit, Beruf",
        "Verwaltung",
        "Küche, Nahrung",
        "Küche, Nahrung, Restaurant",
        "Haus, Haushalt",
        "Gesellschaft",
        "Gesellschaft, Volkskultur",
        "Gesundheitswesen",
        "Militär",
        "IT, Technik",
        "Natur, Geographie",
        "Natur/Geographie",
        "Sport",
        "Menschliches Verhalten",
        "Anderes",
        "Allgemein",
    ]

    def sort_key(cat):
        try:
            return category_order.index(cat)
        except ValueError:
            return len(category_order)

    sorted_cats = sorted(categories.keys(), key=sort_key)

    lines = [
        f"# Helvetismen-Glossar{title_suffix}",
        "",
        "DE-DE → DE-CH. Beim Schreiben auf Schweizer Hochdeutsch die rechte Spalte verwenden.",
        "",
    ]

    total = 0
    for cat in sorted_cats:
        entries = sorted(set(categories[cat]), key=lambda x: x[0].lower())
        if not entries:
            continue
        lines.append(f"## {cat}")
        lines.append("")
        for de_de, swiss in entries:
            lines.append(f"- {de_de} → {swiss}")
            total += 1
        lines.append("")

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        f.write("\n".join(lines))

    return total


def main():
    # Load all sources
    ot_entries = load_openthesaurus()
    wp_entries = load_wikipedia()
    wk_titles = load_wiktionary_titles()

    print(f"Loaded: OpenThesaurus={len(ot_entries)}, Wikipedia={len(wp_entries)}, Wiktionary={len(wk_titles)} titles")

    # Build core glossary
    core_categories = build_core_glossary()
    core_path = os.path.join(REF_DIR, "glossary.md")
    core_count = write_glossary(core_categories, core_path)
    print(f"Core glossary: {core_count} entries → {core_path}")

    # Build full glossary
    full_categories, total_merged = build_full_glossary(ot_entries, wp_entries, wk_titles)
    full_path = os.path.join(REF_DIR, "glossary-full.md")
    full_count = write_glossary(full_categories, full_path, " (Vollständig)")
    print(f"Full glossary: {full_count} entries (from {total_merged} merged) → {full_path}")


if __name__ == "__main__":
    main()
