---
"@quatico-solutions/agent-skills": patch
---

Rename the Homebrew formula from `bb` to `quatico-bb`. The bare name `bb` collides with an unrelated homebrew-cask (getbb.app IDE), so the short install name can never be `bb`. Update the install command in the skill docs and `install-dependencies.sh` to `quatico-bb`, and update the release pipeline's formula-bump script (`Formula/quatico-bb.rb`, branch `formula-bump/quatico-bb-*`).

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
