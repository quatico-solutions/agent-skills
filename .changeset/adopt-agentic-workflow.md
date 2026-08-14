---
"@quatico-solutions/agent-skills": minor
---

New skill `adopt-agentic-workflow`: set up the four-phase workflow in a repository.

Adopting Discovery → Design → Development → Endgame has meant pasting a long prompt into a fresh session — one that hardcoded parameters for two specific projects, cited a reference repo to copy-adapt from, pinned a Plot version, and mixed generic plan-lifecycle setup with our own conventions. It was validated twice and it worked, but it could only be maintained by editing prose and went stale with every Plot release; by the end it still named `plot 1.6.0` and required plan front-matter keys the parser no longer reads.

Plot now ships `/plot-init`, which probes a repo and sets up the plan lifecycle generically. This skill invokes that and adds only the connective layer: **which of our skills serves which phase**, where the Definition of Done lives, and how session logs get written.

The phase map is the point. `triage-ticket` does not know it is a Discovery tool; `commit-notation` does not know it belongs to Development; Plot knows its plan states but nothing about our skills. That mapping exists nowhere in either repo, and writing it into the hub is what turns a set of installed skills into a workflow.

Two things it deliberately does not do. It does not copy the `bb`-versus-`gh` command table into each target — that is now a pointer to `working-with-bitbucket-api`, because a copied table goes stale the day the tool changes and then two sources disagree. And it does not write session logs: `bye` reconstructs compacted history and classifies session types, which a plan-shaped tool cannot, so Plot's `plot-context.sh` supplies the facts and `bye` writes the log.

The dependency runs one way — this skill knows Plot, Plot never knows this skill.

<!--
bumps:
  skills:
    adopt-agentic-workflow: minor
-->
