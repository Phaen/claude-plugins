#!/usr/bin/env bash
# PreToolUse: Edit, Write, MultiEdit — block edits while solve is active.

TREE_POINTER="${PWD}/.claude/solve_current"
[ ! -f "$TREE_POINTER" ] && exit 0

SOLVE_ID=$(cut -d' ' -f1 < "$TREE_POINTER")
[ -z "$SOLVE_ID" ] && exit 0

TREE_FILE="${PWD}/.claude/solve_tree_${SOLVE_ID}.json"
[ ! -f "$TREE_FILE" ] && exit 0

RESULT=$(node "${CLAUDE_PLUGIN_ROOT}/dist/solve-cli.cjs" validate "$SOLVE_ID" "$PWD" 2>&1)
[ $? -eq 0 ] && exit 0

jq -n --arg msg "EDIT BLOCKED — solve tree incomplete. $RESULT" \
  '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$msg}}'
