# schweizer-schreibweise

Development notes for the Swiss Standard German (Schweizer Hochdeutsch) writing skill.

## Goal

Enforce Swiss writing conventions — orthography, typography, vocabulary (Helvetismen), and business terminology — when producing German-language content. Based on the research report at `qubert-config/docs/research/report-swiss-german-skill.md`.

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
| `update-sources.sh` | Re-downloads all source files into `update/` subdirectory |
| `extract-openthesaurus.py` | Extracts Swiss-tagged terms from the SQL dump → `openthesaurus-swiss-extract.json` |

### License Files

| File | Description |
|------|-------------|
| `COPYING` | OpenThesaurus license (LGPL) |
| `DATABASE-README.txt` | OpenThesaurus database readme |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| — | 2026-03-17 | Initial setup: sources downloaded, update script created |
