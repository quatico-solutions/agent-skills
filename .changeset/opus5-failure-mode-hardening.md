---
"@quatico-solutions/agent-skills": minor
---

Harden skills against documented Claude Opus 5 failure modes: delete style constraints and cross-skill duplication (net 92 fewer lines), bound the TDD verification cycle, and add an untrusted-content rule judged by target rather than authorship — in one owning skill plus `bb --help`, with `bb pr view --comments` fencing third-party comment bodies

<!--
bumps:
  skills:
    test-driven-development: minor
    jest-testing-conventions: minor
    handling-pull-requests: minor
    triage-ticket: minor
    working-with-jira-web: minor
    working-with-bitbucket-web: minor
    working-with-bitbucket-api: minor
    branch-and-commit: patch
  tuned-against: claude-opus-5
-->
