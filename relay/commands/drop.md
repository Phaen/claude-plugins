---
allowed-tools: Glob(.claude/session-relay-*.md), Bash(rm .claude/session-relay-*:*)
---

# Drop Session Relay

Delete a relay file when it's no longer needed.

## Steps

1. Determine which relay to delete:
   - If `$ARGUMENTS` is provided, Glob for `.claude/session-relay-*.md` in the project root and pick the one whose subject best matches the argument.
   - If no arguments, use the relay file you most recently picked up or created in this session. If none exists in context, Glob and pick the most recently modified one.
2. Run `rm <path>` to delete it.
3. Confirm to the user which file was deleted.
