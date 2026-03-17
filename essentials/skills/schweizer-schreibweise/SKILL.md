---
name: schweizer-schreibweise
description: "Use when writing or reviewing German-language content for Swiss audiences — orthography (ss not ß), typography (guillemets, apostrophe thousands, CHF prefix), grammar (Perfekt, dative), vocabulary (Helvetismen). Triggers: Swiss German, Schweizer Hochdeutsch, DE-CH, Swiss writing."
compatibility: claude-code, cursor
license: MIT
metadata:
  version: "1.0.0"
---

# Schweizer Schreibweise

Swiss Standard German (Schweizer Hochdeutsch) writing conventions per Bundeskanzlei rules.

**Authority hierarchy:** When sources conflict, the Bundeskanzlei (Federal Chancellery) wins. It defines the official standard for Swiss federal texts and is the reference for typography, punctuation, numbers, dates, and currency.

- **Bundeskanzlei Schreibweisungen** (2nd ed., 2015) — typography, punctuation, numbers, dates, currency
- **Bundeskanzlei Rechtschreibleitfaden** (4th ed., 2017) — orthography, ss rule, word list

## Orthography

**One rule: ss replaces ß everywhere.** No exceptions.

Reformed Orthography §25 E2 mandates this for Switzerland. The ß character does not exist in Swiss Standard German.

| Wrong | Correct |
|-------|---------|
| Straße | Strasse |
| Maßnahme | Massnahme |
| gemäß | gemäss |
| Fußball | Fussball |
| außerdem | ausserdem |
| Grüße | Grüsse |
| schließen | schliessen |

When converting DE-DE text to Swiss Standard German, replace every ß with ss. This is the single most visible marker of Swiss writing.

## Typography

Swiss typography differs from German typography in quotation marks, number formatting, and currency. These rules are mandatory in professional and official Swiss texts.

### Quotation Marks

Use **guillemets** (Chevrons), pointing inward. No space between guillemet and text.

| Level | Swiss (DE-CH) | German (DE-DE) |
|-------|---------------|----------------|
| Primary quotes | «Text» | „Text" |
| Nested quotes | «Er sagte ‹Nein›» | „Er sagte ‚Nein'" |
| English fallback | If guillemets unavailable: "Text" | „Text" |

Characters:
- « = U+00AB (left-pointing double angle)
- » = U+00BB (right-pointing double angle)
- ‹ = U+2039 (left-pointing single angle)
- › = U+203A (right-pointing single angle)

**Common mistake:** French guillemets point outward (« Text ») with spaces. Swiss guillemets point inward with no spaces: «Text».

### Number Formatting

| Element | Swiss (DE-CH) | German (DE-DE) | Example |
|---------|---------------|-----------------|---------|
| Thousands separator | Apostrophe or thin space | Period | 1'000 or 1 000 (not 1.000) |
| Decimal: general | Comma | Comma | 4,6 km |
| Decimal: currency | **Point** | Comma | CHF 99.95 (not 99,95) |
| Telephone numbers | Groups of 2 from right | Various | 044 123 45 67 |

The apostrophe thousands separator (1'000) is the most common Swiss convention. The official Bundeskanzlei style uses thin spaces (1 000), but apostrophe is universally accepted and more common in business writing.

**Critical:** Currency decimals use a point (CHF 99.95), not a comma. This is the opposite of general decimals (4,6 km). This trips up many writers.

### Currency

| Rule | Swiss (DE-CH) | German (DE-DE) |
|------|---------------|----------------|
| Position | **Prefix**: CHF 100.00 | **Suffix**: 100,00 € |
| Symbol | CHF (always, never Fr.) | € |
| Decimal | Point: CHF 99.95 | Comma: 99,95 € |
| Thousands | CHF 1'000.00 | 1.000,00 € |

Always write `CHF` followed by a space, then the amount with point decimals:
- CHF 1'250.00
- CHF 99.95
- CHF 0.50

For ranges: CHF 100.00 bis 200.00 (not CHF 100.00–200.00)

### Time

| Swiss (DE-CH) | German (DE-DE) |
|----------------|----------------|
| 13.30 Uhr | 13:30 Uhr |
| 8.00 Uhr | 8:00 Uhr |
| 09.15 Uhr | 09:15 Uhr |

Swiss time uses a **period** as separator, not a colon.

### Date

| Format | Swiss (DE-CH) | Notes |
|--------|---------------|-------|
| Long | 1. Januar 2025 | Same as DE-DE |
| Short numeric | 01.01.2025 | Same as DE-DE |
| ISO | 2025-01-01 | Acceptable in technical contexts |

Dates are the same as in Germany. No difference here.

## Grammar

Swiss Standard German has grammatical preferences that differ from DE-DE. These are **preferences, not hard rules** — but following them makes text sound authentically Swiss rather than translated from German.

### Past Tense: Prefer Perfekt

Swiss German strongly prefers Perfekt (compound past) over Präteritum (simple past) in almost all contexts, including formal writing.

| Avoid (Präteritum) | Prefer (Perfekt) |
|---------------------|-------------------|
| Er ging nach Hause. | Er ist nach Hause gegangen. |
| Sie schrieb den Brief. | Sie hat den Brief geschrieben. |
| Wir fanden eine Lösung. | Wir haben eine Lösung gefunden. |

**Exception:** The verbs *sein*, *haben*, and *werden* may use Präteritum even in Swiss writing: «Er war krank» is fine alongside «Er ist krank gewesen».

### Date Prepositions: per instead of zum

| German (DE-DE) | Swiss (DE-CH) |
|-----------------|---------------|
| zum 1. Januar | per 1. Januar |
| ab dem 1. Januar | per 1. Januar (or ab 1. Januar) |

### Dative with Prepositions

Swiss German often prefers dative where DE-DE uses genitive after certain prepositions.

| German (DE-DE, genitive) | Swiss (DE-CH, dative) |
|---------------------------|------------------------|
| trotz des Regens | trotz dem Regen |
| wegen des Wetters | wegen dem Wetter |
| während des Krieges | während dem Krieg |

This is a preference in informal and semi-formal writing. In highly formal legal or academic text, genitive is acceptable.

### Position Verbs: sein instead of haben

Swiss German uses *sein* as auxiliary for position verbs (sitzen, stehen, liegen, hängen):

| German (DE-DE) | Swiss (DE-CH) |
|-----------------|---------------|
| Ich habe gesessen. | Ich bin gesessen. |
| Er hat gestanden. | Er ist gestanden. |
| Sie hat gelegen. | Sie ist gelegen. |

## Vocabulary: Helvetismen

Swiss Standard German uses distinct words (Helvetismen) for many everyday and business concepts. Using the DE-DE word is understood but sounds foreign in Swiss context.

### Top-20 Business Terms

These are the highest-frequency Helvetismen in professional Swiss writing. Always prefer the Swiss term.

| DE-DE (German) | DE-CH (Swiss) | Domain |
|----------------|---------------|--------|
| Angebot | Offerte | Handel |
| Hausmeister | Hauswart | Immobilien |
| Zwangsvollstreckung | Betreibung | Recht |
| Tagesordnungspunkt | Traktandum (Pl: Traktanden) | Verwaltung |
| parken | parkieren | Verkehr |
| Fahrkarte | Billett | Verkehr |
| Bahnsteig | Perron | Verkehr |
| Fahrrad | Velo | Verkehr |
| Bürgersteig, Gehweg | Trottoir | Verkehr |
| Pendenz, offener Punkt | Pendenz | Verwaltung |
| Friseur | Coiffeur | Alltag |
| Führerschein | Führerausweis | Verkehr |
| Speiseeis | Glace | Alltag |
| Abitur | Matura | Bildung |
| Bereitschaftsdienst | Pikettdienst | Arbeit |
| Einzelhandel | Detailhandel | Handel |
| Grundschule | Primarschule | Bildung |
| Verordnung, Vorschrift | Reglement | Recht |
| Anzahlung, Abschlag | Akontozahlung | Finanzen |
| Dachboden | Estrich | Immobilien |

### Full Glossary

For complete vocabulary, read:
- `references/glossary.md` — ~200 core business and everyday terms, categorized by domain
- `references/glossary-full.md` — ~1,200 merged entries from OpenThesaurus, Wikipedia, and Wiktionary

**When to load the glossary:** Load `references/glossary.md` when writing or reviewing Swiss German text that goes beyond the top-20 terms above. Load `references/glossary-full.md` only when comprehensive coverage is needed or when a specific term is not found in the core glossary.

## Quick Checklist

When writing or reviewing Swiss German text, verify:

1. **No ß** — every ß replaced with ss
2. **Guillemets** — «» for quotes, ‹› for nested (not „" or "")
3. **Numbers** — apostrophe thousands (1'000), comma decimals (4,6), but point for currency (CHF 99.95)
4. **Currency** — CHF prefix with point decimals (CHF 1'250.00)
5. **Time** — period separator (13.30 Uhr, not 13:30)
6. **Past tense** — Perfekt preferred over Präteritum
7. **Vocabulary** — Helvetismen for common terms (check glossary if unsure)
