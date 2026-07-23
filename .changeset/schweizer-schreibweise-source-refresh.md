---
"@quatico-solutions/agent-skills": patch
---

schweizer-schreibweise: refresh glossary sources and harden the downloader

Re-ran the source pipeline. OpenThesaurus grew by 11 Swiss-tagged terms and
Wikipedia added one Helvetism (Störefried → Störenfried), yielding 10 net new
entries in `glossary-full.md` (1113 → 1123); the curated core glossary is
unchanged. Also hardened `update-sources.sh`: it now validates the `%PDF-`
magic and falls back to the latest Wayback Machine snapshot when a primary URL
fails, so the recurring bk.admin.ch `/dam/` 502s no longer write 16-byte error
pages over the Bundeskanzlei PDFs.

<!--
bumps:
  skills:
    schweizer-schreibweise: patch
-->
