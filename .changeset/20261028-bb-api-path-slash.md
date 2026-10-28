---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: `bb api` accepts a path without a leading `/`. Before, `bb api repositories/…` requested `…/2.0repositories/…` and answered `HTTP 403 — Forbidden`. A full URL on the API base, such as a `next` link from a listing, is also accepted. Any other URL exits 1 with `error: bb api takes a path on <base>, not a URL` and sends no request, so the token never goes to another host.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
