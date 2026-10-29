---
"@quatico-solutions/agent-skills": patch
---

working-with-bitbucket-api: every `bb` command now prints one stderr line when it has no credentials and one when a request gets no HTTP answer. Missing credentials print `error: no Bitbucket API token found — run: bb auth login, or export BB_TOKEN=<token>` (three lines before). No response prints `error: no response from Bitbucket (<reason>)`, where the reason is curl's own text, for example `Failed to connect to 127.0.0.1 port 9 after 0 ms: Couldn't connect to server`; curl's separate `curl: (N) …` line no longer appears. Exit codes stay the same (1 for errors, 75 for HTTP 429). Scripts that match the old multi-line text must match the new line. `bb auth status` text output also changed in [#121](https://github.com/quatico-solutions/agent-skills/pull/121): it prints `nickname`, `display_name`, `account_id` and `credentials` lines, and its `--json` form prints `{nickname, display_name, account_id, uuid, credentials}`.

<!--
bumps:
  skills:
    working-with-bitbucket-api: patch
-->
