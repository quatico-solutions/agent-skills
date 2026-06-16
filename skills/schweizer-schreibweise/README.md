# schweizer-schreibweise

Development notes for the Swiss Standard German (Schweizer Hochdeutsch) writing skill.

## Goal

Enforce Swiss writing conventions — orthography, typography, vocabulary (Helvetismen), and business terminology — when producing German-language content.

**No comparable tool exists.** No Claude Code skill, no open-source prompt, no npm/PyPI package for Swiss Standard German as a writing style. The NLP community has focused on Swiss German *dialect* (speech recognition, dialect classification) — Swiss Standard German as a written standard is uncharted territory.

Based on the research report at `qubert-config/docs/research/report-swiss-german-skill.md`.

## Target Architecture

```
skills/schweizer-schreibweise/
  SKILL.md                # Process rules (orthography, typography, grammar)
  references/
    glossary.md           # ~200 core business terms, categorized Markdown
    glossary-full.md      # Complete ~1,200 entries (loaded on demand)
  sources/                # Raw data and extraction scripts (not shipped)
```

**Why separate reference files?** Reference files don't consume context tokens until explicitly read, the glossary will grow independently of the skill logic, and mixing instructions with data causes "attention dilution" — the model confuses instructions with data.

## Rules to Codify

### Orthography

- **ss replaces ß everywhere** — Reformed Orthography §25 E2, mandated by Bundeskanzlei. No exceptions.

### Typography

| Rule | Swiss (DE-CH) | German (DE-DE) |
|------|---------------|----------------|
| Quotation marks | «Guillemets» (no space) | „Gänsefüsschen" |
| Nested quotes | «Er sagte ‹Nein›» | „Er sagte ‚Nein'" |
| Thousands separator | 1'000 (apostrophe) or 1 000 (official) | 1.000 |
| Decimal: general | 4,6 km (comma) | 4,6 km (same) |
| Decimal: currency | CHF 99.95 (point!) | 99,95 € |
| Currency position | CHF 100.00 (prefix) | 100,00 € (suffix) |
| Time | 13.30 Uhr (period) | 13:30 Uhr (colon) |
| Date (long) | 1. Januar 2025 | 1. Januar 2025 (same) |

### Grammar

| Feature | Swiss preference | Standard German |
|---------|-----------------|-----------------|
| Past tense | Perfekt preferred | Präteritum common |
| Date preposition | «per 1. Januar» | «zum 1. Januar» |
| Dative with prepositions | «trotz dem Regen» | «trotz des Regens» |
| Auxiliary for position verbs | «ich bin gesessen» | «ich habe gesessen» |

### Primary Rule Sources

The **Bundeskanzlei** (Federal Chancellery) is the highest authority. When sources contradict each other, the Bundeskanzlei rules win.

| Document | Content |
|----------|---------|
| **Bundeskanzlei Schreibweisungen** (2nd ed.) | Typography, punctuation, numbers, dates, currency, abbreviations |
| **Bundeskanzlei Rechtschreibleitfaden** (4th ed., 2017) | Orthography, ss rule, word list, spelling choices |

## Glossary Strategy

### Format: Categorized Markdown with Arrow Notation

```markdown
## Liegenschaftsverwaltung
- Hausmeister → Hauswart
- Erdgeschoss → Erdgeschoss (EG; Parterre is also common)

## Abrechnungswesen
- Vorauszahlung → Akontozahlung
- Zwangsvollstreckung → Betreibung
```

**Why this format?** Benchmarks (ImprovingAgents, 2025) show Markdown-KV outperforms CSV and JSONL by 16+ percentage points for LLM accuracy. Headers provide domain categorization (proven to help retrieval), arrow notation is token-compact (~1.1x baseline), and Markdown is native to Claude Code skills.

### Size Limits

| Size | Zone | Recommendation |
|------|------|----------------|
| 50–200 terms | Sweet spot | Reliable accuracy, low token cost |
| 200–500 terms | Caution | Benefits from categorization |
| 500+ terms | Danger | Use selective loading per domain |

The core glossary (~200 terms) stays in the sweet spot. The full glossary (~1,200 terms) should be split by domain or loaded selectively.

### Processing Pipeline

1. **OpenThesaurus** (`extract-openthesaurus.py`): SQL dump → 936 Swiss-tagged pairs
2. **Wikipedia** (LLM subagents + `extract-wikipedia.py`): wikitext → 337 clean entries across 14 categories
3. **Wiktionary**: 763 title entries (term names only, no DE-DE equivalent)
4. **Merge + filter** (`build-glossary.py`): deduplicate, apply blocklist, normalize categories → **1,113 full glossary entries**
5. **Core glossary**: 80 curated business-relevant Helvetismen

**Why LLM for Wikipedia extraction?** Regex can parse structure but can't distinguish "DE-DE equivalent" from "Austrian synonym", "description", or "etymology note" in free-form prose parentheticals. Four parallel LLM subagents reading the 14 wikitext sections achieved near-zero error rate vs ~135 errors from the regex approach.

## Sources

All source files live in `sources/` and can be re-downloaded with `sources/update-sources.sh`.
After downloading, run `sources/extract-openthesaurus.py` to extract Swiss-tagged terms from the SQL dump.

### Official Style Guides (PDFs)

| File | Source | URL | Downloaded |
|------|--------|-----|------------|
| `bundeskanzlei-schreibweisungen.pdf` | Bundeskanzlei Schreibweisungen (2nd ed.) | https://www.bk.admin.ch/dam/bk/de/dokumente/sprachdienste/sprachdienst_de/schreibweisungen.pdf.download.pdf/schreibweisungen.pdf | 2026-03-17 |
| `bundeskanzlei-rechtschreibleitfaden-2017.pdf` | Bundeskanzlei Rechtschreibleitfaden (4th ed., 2017) | https://www.bk.admin.ch/dam/bk/de/dokumente/sprachdienste/sprachdienst_de/rechtschreibleitfaden-2017.pdf.download.pdf/rechtschreibleitfaden-2017.pdf | 2026-03-17 |
| `sok-wegweiser-2024.pdf` | SOK Wegweiser (3rd ed., 2024) — spelling variant recommendations | https://sok.ch/files/2024/10/SOK_wegweiser_23102024.pdf | 2026-03-17 |
| `stadt-zuerich-richtlinien.pdf` | Stadt Zürich Richtlinien Rechtschreibung | https://www.stadt-zuerich.ch/content/dam/web/de/politik-verwaltung/kommunikation-und-transparenz/sprache/staedtische-richtlinien-rechtschreibung.pdf | 2026-03-17 |
| `kanton-thurgau-schreibweisungen.pdf` | Kanton Thurgau Schreibweisungen | https://rechtsdienst.tg.ch/public/upload/assets/131046/210325_Schreibweisungen_KVTG.pdf | 2026-03-17 |

### Glossary Data

| File | Entries | Source | URL | License | Downloaded |
|------|---------|--------|-----|---------|------------|
| `openthesaurus_dump.sql` | 211,883 total | OpenThesaurus MySQL dump (gitignored, 32 MB) | https://www.openthesaurus.de/export/openthesaurus_dump.tar.bz2 | LGPL / CC-BY-SA | 2026-03-17 |
| `openthesaurus-swiss-extract.json` | 1,003 Swiss-tagged | Extracted via `extract-openthesaurus.py` | — | LGPL / CC-BY-SA | 2026-03-17 |
| `wikipedia-helvetismen.json` | ~603 | Wikipedia: Liste von Helvetismen (wikitext via API) | https://de.wikipedia.org/wiki/Liste_von_Helvetismen | CC-BY-SA 4.0 | 2026-03-17 |
| `wiktionary-schweizer-hochdeutsch-1.json` | 500 | Wiktionary: Kategorie Schweizer Hochdeutsch (page 1) | https://de.wiktionary.org/wiki/Kategorie:Schweizer_Hochdeutsch | CC-BY-SA 3.0 | 2026-03-17 |
| `wiktionary-schweizer-hochdeutsch-2.json` | 265 | Wiktionary: Kategorie Schweizer Hochdeutsch (page 2) | https://de.wiktionary.org/wiki/Kategorie:Schweizer_Hochdeutsch | CC-BY-SA 3.0 | 2026-03-17 |

### Scripts

| File | Description |
|------|-------------|
| `update-sources.sh` | Re-downloads all source files |
| `extract-openthesaurus.py` | Extracts Swiss-tagged terms from the SQL dump → `openthesaurus-swiss-extract.json` |
| `extract-wikipedia.py` | Documents the LLM-based extraction approach; validates `wikipedia-helvetismen-extract.json` |
| `build-glossary.py` | Merges all sources → `references/glossary.md` and `references/glossary-full.md` |

**To regenerate glossaries from scratch:**

```bash
# From the skill root:
python3 sources/extract-openthesaurus.py   # → openthesaurus-swiss-extract.json
# Re-extract Wikipedia: split wikitext by ==== headers, feed groups to LLM subagents
# (see sources/extract-wikipedia.py for the documented approach)
python3 sources/build-glossary.py          # → references/glossary.md + glossary-full.md
```

### License Files

| File | Description |
|------|-------------|
| `COPYING` | OpenThesaurus license (LGPL) |
| `DATABASE-README.txt` | OpenThesaurus database readme |

## Next Steps

1. **TDD verification** — test retrieval, application, and gap coverage with subagents
2. **Expand core glossary** — currently 80 entries; could grow to ~150 with more domain-specific curation
3. **Wikipedia re-extract trigger** — if `update-sources.sh` fetches a newer Wikipedia revision, re-run LLM extraction (see `extract-wikipedia.py` for the documented prompt approach)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| — | 2026-03-17 | Initial setup: sources downloaded, update script created |
| — | 2026-03-17 | README updated with research findings: architecture, rules, glossary strategy |
| 1.0.0 | 2026-03-17 | SKILL.md written; glossary pipeline built; `references/glossary.md` (80 terms) and `references/glossary-full.md` (1,265 terms, regex extraction) |
| 1.0.1 | 2026-03-17 | Glossary quality overhaul: LLM-based Wikipedia extraction (337 clean entries replacing 557 noisy ones), BLOCKLIST + DE_DE_OVERRIDES for OpenThesaurus source errors, same-term filter, category normalization. Full glossary: 1,265 → 1,113 clean entries. |
