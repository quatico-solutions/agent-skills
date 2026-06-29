# Security Policy

These skills are documentation and small helper scripts (notably the `bb` CLI in
`working-with-bitbucket-api`). If you find a vulnerability — for example a script
that could leak credentials or run unintended commands — please report it
privately.

## Reporting

- Preferred: GitHub **private vulnerability reporting** — the **Security** tab of
  this repository → *Report a vulnerability*.
- Alternatively, contact the maintainers at Quatico Solutions AG.

Please do **not** open a public issue for security problems. We'll acknowledge
your report and keep you updated on the fix.

## Scope

In scope: anything shipped in this repository (skill scripts, `install-dependencies.sh`,
the `bb` CLI). Out of scope: the third-party services the skills interact with
(Bitbucket, Jira, etc.) — report those to the respective vendors.
