---
"@quatico-solutions/agent-skills": minor
---

working-with-bitbucket-api: `bb --version` prints `bb <version> (quatico-bb — brew install quatico-solutions/tap/quatico-bb)` and the first line of `bb --help` names the same package and install command. Before, `bb --version` printed `bb 1.12.1`, which did not tell the three Homebrew packages that answer to `bb` apart (#113). The SKILL.md lists the three packages and tells an agent to stop and report when `bb --version` does not contain `quatico-bb`. The first two words stay `bb <version>`; Plot's `bb_identify` reads the first semver and the word `quatico` from the line.

<!--
bumps:
  skills:
    working-with-bitbucket-api: minor
-->
