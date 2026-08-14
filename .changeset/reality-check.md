---
"@quatico-solutions/agent-skills": minor
---

New skill `reality-check`: verify claims by trying to disprove them.

An agent inspecting its own mechanism will usually conclude it works, because the mental model it uses to read is the same one it used to write. Only execution can contradict that model — so this skill dispatches **separate** subagents, briefs each to *refute* a claim rather than confirm it, and requires reports to separate what was **executed** from what was only **read**.

The shape was observed rather than designed. Two adversarial audits against a feature in a sibling repo each found something its author had already checked and cleared: a supposedly-atomic locking mechanism that provided no mutual exclusion at all (135 passing tests coexisted with it, because none exercised the contested case), and then, auditing the fix, a detection that could be fooled by a commit subject into offering to delete a branch holding real unmerged work. Both findings came from executing in a throwaway repo, not from reading.

It replaces a `reality-checker` agent definition that had to be copied and re-adapted per repo, carrying that repo's Definition of Done in its own text — which drifted, and when adapted wrongly flagged correct commits as violations. This reads the DoD at run time instead, or asks when none is written down.

Includes the revert test: for a claim of the form "X is fixed", revert the fix and confirm a test goes red. An unprotected fix is a finding in its own right — that check found an untested surface where reverting a validation guard left an entire suite green.

<!--
bumps:
  skills:
    reality-check: minor
    adopt-agentic-workflow: patch
-->
