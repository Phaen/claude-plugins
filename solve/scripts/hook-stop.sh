#!/usr/bin/env bash
# Stop hook: validate solve tree is complete before allowing the agent to stop.
# No-ops if not in an active solve session.

TREE_POINTER="${PWD}/.claude/solve_current"
[ ! -f "$TREE_POINTER" ] && exit 0

SOLVE_ID=$(cut -d' ' -f1 < "$TREE_POINTER")
[ -z "$SOLVE_ID" ] && exit 0

TREE_FILE="${PWD}/.claude/solve_tree_${SOLVE_ID}.json"
[ ! -f "$TREE_FILE" ] && exit 0

RESULT=$(node "${CLAUDE_PLUGIN_ROOT}/dist/solve-cli.cjs" validate "$SOLVE_ID" "$PWD" 2>&1)
if [ $? -ne 0 ]; then
  jq -n --arg msg "$RESULT" '{"decision":"block","reason":$msg}'
fi
exit 0
