Position: supported
Evidence: executed

Executed against cli/bb on main with a local stub server: text and --json output (0 stderr lines, no token or email in either stream); 401 gives exit 1 and 1 stderr line; 429 gives exit 75 and no "429" in stderr; closed port gives exit 1 and 1 line carrying curl's reason; no credentials gives exit 1 and 1 stderr line for whoami, api /user, pr list and auth status; whoami --help and auth status --help print the same help; bb --help lists whoami. The suite passes (tests 313, pass 313, fail 0). Not run: SKILL.md and changelog text (read only, not in my lens).
