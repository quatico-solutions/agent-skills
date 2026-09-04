# pnpm

Development notes for the pnpm skill.

## Purpose

Agents in pnpm repositories do more work than a task needs, or give up. The skill gives the pnpm facts that change a decision, six recipes that each end with a proof command, and a table that maps the observed give-up phrases and shortcuts to the recipe that answers them.

## Structure

| File | Content |
|---|---|
| `SKILL.md` | Facts, preflight checks, six recipes, pitfall table, quick reference (always loaded) |
| `REFERENCE.md` | Settings locations for pnpm 10 and 11, install flags, hoisting, registry, supply chain, error codes, pack, link comparison, migration (loaded on demand) |

## Failure classes the skill targets

Observed over three months of agent sessions across several pnpm repositories:

1. Deleting `pnpm-lock.yaml` and reinstalling to resolve a merge conflict, which re-resolves every floating range and smuggles upgrades into the merge commit.
2. Hand-editing a lockfile conflict when `pnpm install` on the markers does it in one step; and the inverse, running a plain install on a marker-free broken lockfile, which silently regenerates it.
3. Declaring that a library change "can only be tested after merge and release" when `pnpm pack` plus a root override verifies it in the consumer now.
4. Proposing a wrapper or waiting for an upstream release when `pnpm patch` ships the fix in place.
5. Inventing a "pnpm hoisting" mechanism to explain an empty search result that came from a drifted working directory.
6. Reporting the default branch as broken because a convenience script failed, without checking what CI runs or which pnpm is on `PATH`.

## Design decisions

| Decision | Answer | Rationale |
|---|---|---|
| Scope | Package workflows only | The observed failures are package-level; release and changeset conventions differ per repository and have their own home |
| Structure | Recipes plus a pitfall table | Give-up failures need a positive recipe; the delete-the-lockfile shortcut needs a prohibition with a red flag |
| Versions | pnpm 10 and 11 | Both are current; the settings-location difference is stated once in `SKILL.md` and tabled in `REFERENCE.md` |
| Vendor neutrality | No registry, CI, or project names | Publishable; repository-specific rules belong in each repository's own agent instructions |

## Tier

**Publishable.** Generic pnpm knowledge, verified against pnpm.io and run on pnpm 10.27 and 11.25.

## Testing

Four scenarios, each run first without the skill (baseline, rationalizations recorded verbatim) and then with the skill text loaded:

| Scenario | Fixture | Pass condition |
|---|---|---|
| Lockfile conflict | F1: single-package repo, branch with a real three-hunk lockfile conflict against `main`; a floating range pinned below its latest version | merge, plain install on the markers, pinned version kept, frozen install passes |
| Local verification | F2: workspace with a library and an app, plus a separate consumer installed from a packed tarball | build, pack with a local version, consumer installed from the tarball, consumer tests run, resolved path reported |
| Broken lockfile | F3: marker-free duplicate-key lockfile from a textual merge | cause named, repair from base branch or by removing the duplicate, pinned version kept, frozen install passes |
| Hoisting question | F4: prompt only | states that nothing is hoisted to the top level by default and names the real candidates |

The fixtures are not published; they live outside this repository, as small git repositories with a reset script each. Rebuild them from the scenario they cover. F1 is a single-package repository with a floating range pinned below its latest publish and a lockfile behind that publish, plus two branches that each add a different dependency, the two dependency names next to each other alphabetically so the merge produces a real three-hunk conflict. F2 is a workspace with a library that declares `files` and `publishConfig`, plus a separate consumer package installed from a tarball packed from that library. F3 starts from F1 but has both branches add the same dependency at different versions, then resolves the conflict by keeping both sides without conflict markers, which produces the marker-free duplicate-key lockfile. F4 carries no fixture repository at all; it is a hoisting question asked as a bare prompt, with no code to inspect. A run fails when any baseline failure reappears.

## Known gaps

- No coverage of `pnpm deploy`, `pnpm publish`, or changeset flows.
- Plug'n'Play (`nodeLinker: pnp`) is named, not described.
- pnpm 12 (the Rust rewrite) is not verified; the settings advice is expected to hold.
