# AGENTS.md

Instructions for coding agents working in the `agent-skills` repository.

> **[CLAUDE.md](CLAUDE.md) is the source of truth.** This file exists so agents
> that look for `AGENTS.md` by convention (Codex, Cursor, and others) find the
> repository's rules instead of nothing. It restates the rules that are easy to
> violate without noticing; everything else — repository structure, the full
> versioning flow, Plot configuration — lives in CLAUDE.md and is not duplicated
> here.
>
> A previous copy of this file was produced by a blind `Claude` → `Codex`
> find-and-replace, which invented a `.Codex-plugin/` directory and a
> `Codex-opus-5` model family, and dropped the bash 3.2 rule entirely. If you
> are tempted to regenerate this file mechanically: don't. Where the two files
> disagree, CLAUDE.md wins.

## Rules that bite

**1. Never edit version numbers by hand.** Versioning is changeset-driven. Do
not touch `metadata.version` in any `SKILL.md`, `version` in
`.claude-plugin/plugin.json` or `.cursor-plugin/plugin.json`, the
`marketplace.json` files, or `package.json`. The release pipeline owns all of
them.

**2. Every change touching a skill needs a changeset.** `pnpm changeset`, then
edit the created file: a one-line summary, a root-package bump, and a `bumps:`
block listing each changed skill. Record `tuned-against: claude-opus-5` (the
model family, never a dated snapshot) when a change is model-specific. CI only
*warns* when a changeset is missing — it will not catch this for you.

**3. Shell scripts must stay bash 3.2-compatible.** macOS ships bash 3.2 and
always will (bash 4 went GPLv3): no `declare -A`, no `${var^^}`/`${var,,}`, no
`mapfile`. Under `set -u`, expand possibly-empty arrays as
`${arr[@]+"${arr[@]}"}`. Gated for `bin/bb` by the `bb-tests-macos` CI job,
which pins `/bin/bash`; every other script relies on this rule alone.

**4. Never use YAML block scalars in SKILL.md frontmatter.** No `>-`, `>`, `|-`,
`|` — Cursor does not parse them. `description` is a single-line quoted string;
`metadata.version` is 3-part semver.

**5. Update README.md whenever skill membership changes.** The skills table must
match the contents of `skills/`. Adding or removing a skill without touching the
table leaves the two out of sync, and nothing checks it.

**6. Prefer gates over rules.** A rule is prose an agent can rationalise around;
a gate is a hard stop with objective verification (a hook, a CI check). The
test: can you answer "did I complete this?" without doing the work? If yes, it
is a rule. Every item on this page is currently a rule — which is exactly why
they are worth reading twice.

## Definition of Done

A change is done when all three pass:

1. `pnpm test` — skills parse
2. `pnpm run validate` — skill frontmatter valid
3. `pnpm test` in `skills/working-with-bitbucket-api/tests/` — the `bb`
   integration suite on Linux **and** macOS/bash 3.2, when the diff touches
   `bin/bb`

Plus a changeset, per rule 2.

## Where to look next

| For | Read |
|---|---|
| Repository structure, plugin layout | [CLAUDE.md](CLAUDE.md) § Repository Structure |
| The full versioning and release flow | [CLAUDE.md](CLAUDE.md) § Versioning, [CONTRIBUTING.md](CONTRIBUTING.md) |
| Skill authoring conventions | [CLAUDE.md](CLAUDE.md) § Skill Development |
| Plot planning workflow, branch prefixes | [CLAUDE.md](CLAUDE.md) § Plot Config |
