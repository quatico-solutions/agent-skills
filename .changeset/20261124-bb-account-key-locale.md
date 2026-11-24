---
"@quatico-solutions/agent-skills": patch
---

`bb` gives an account with a non-ASCII email the same ledger key in every locale: it lowercases A-Z only, under `LC_ALL=C`. An email with A-Z that a Turkish or Azerbaijani locale lowercased differently also gets a new key, the one Plot's fleetd uses.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
