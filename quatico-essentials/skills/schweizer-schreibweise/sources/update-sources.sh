#!/usr/bin/env bash
# Re-downloads all reference sources into a fresh sources/update/ subdirectory.
# Aborts if the update/ directory already exists (to prevent accidental overwrites).
set -euo pipefail
cd "$(dirname "$0")"

if [ -d update ]; then
  echo "Error: update/ already exists. Remove it first." >&2
  exit 1
fi

mkdir update
cd update

UA="User-Agent: Mozilla/5.0 (Macintosh)"

echo "Downloading PDFs..."
curl -sL -o bundeskanzlei-schreibweisungen.pdf \
  "https://www.bk.admin.ch/dam/bk/de/dokumente/sprachdienste/sprachdienst_de/schreibweisungen.pdf.download.pdf/schreibweisungen.pdf"
curl -sL -o bundeskanzlei-rechtschreibleitfaden-2017.pdf \
  "https://www.bk.admin.ch/dam/bk/de/dokumente/sprachdienste/sprachdienst_de/rechtschreibleitfaden-2017.pdf.download.pdf/rechtschreibleitfaden-2017.pdf"
curl -sL -o sok-wegweiser-2024.pdf \
  "https://sok.ch/files/2024/10/SOK_wegweiser_23102024.pdf"
curl -sL -o stadt-zuerich-richtlinien.pdf \
  "https://www.stadt-zuerich.ch/content/dam/web/de/politik-verwaltung/kommunikation-und-transparenz/sprache/staedtische-richtlinien-rechtschreibung.pdf"
curl -sL -o kanton-thurgau-schreibweisungen.pdf \
  "https://rechtsdienst.tg.ch/public/upload/assets/131046/210325_Schreibweisungen_KVTG.pdf"

echo "Downloading OpenThesaurus dump..."
curl -sL "https://www.openthesaurus.de/export/openthesaurus_dump.tar.bz2" | tar -xj

echo "Downloading Wikipedia Helvetismen..."
curl -sL -H "$UA" -o wikipedia-helvetismen.json \
  "https://de.wikipedia.org/w/api.php?action=parse&page=Liste_von_Helvetismen&prop=wikitext&format=json"

echo "Downloading Wiktionary Schweizer Hochdeutsch..."
curl -sL -H "$UA" -o wiktionary-schweizer-hochdeutsch-1.json \
  "https://de.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=Kategorie:Schweizer_Hochdeutsch&cmlimit=500&format=json"

# Get continuation token from page 1, fetch page 2 if it exists
CONTINUE=$(python3 -c "import json; d=json.load(open('wiktionary-schweizer-hochdeutsch-1.json')); print(d.get('continue',{}).get('cmcontinue',''))" 2>/dev/null)
if [ -n "$CONTINUE" ]; then
  curl -sL -H "$UA" -o wiktionary-schweizer-hochdeutsch-2.json \
    "https://de.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=Kategorie:Schweizer_Hochdeutsch&cmlimit=500&cmcontinue=${CONTINUE}&format=json"
fi

echo "Done. Files in update/:"
ls -lh
