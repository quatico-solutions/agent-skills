---
"@quatico-solutions/agent-skills": patch
---

release: generate `.cursor-plugin/marketplace.json` too — it had been frozen at 2.0.0

`generate-skill-manifests.sh` hardcoded the Claude manifest path and wrote only
that file, so `.cursor-plugin/marketplace.json` was touched by nothing in the
release pipeline. It still advertised `version: 2.0.0` and a single plugin entry
while the package had reached 3.8.0 — every skill version Cursor could see was
whatever happened to be true when the file was hand-written.

`sync-versions.sh` did keep both `plugin.json` files in step, which is why this
went unnoticed: the Cursor plugin's *own* version was right, only its
marketplace listing was stale.

The generated `.plugins` array is identical for both targets; each file's own
top-level fields are preserved (Claude's has a `metadata` block, Cursor's does
not, and neither gains the other's). A listed manifest that does not exist is
skipped rather than created — adding a marketplace is a deliberate act. If
*none* of them exists the script now exits 1 instead of quietly succeeding,
because a release that silently updates no manifest is a broken release.

No skill content changes, so this changeset carries no `bumps:` block — release
tooling only, at the package level.
