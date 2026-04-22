# solve

A Claude Code plugin that enforces structured problem-solving before any file edits. The agent must build a complete solution tree — declare all solutions, investigate each, resolve or block — before the edit gate unlocks.

## How it works

**Entry point:** `commands/solve.md` — the slash command prompt injected when `/solve` is invoked.

**State:** Each solve invocation creates a `solve_tree_<session>_<timestamp>.json` in `.claude/` of the project being worked on. The tree tracks every solution node (pending → investigating → investigated → resolved/failed) and sub-problem nodes.

**Hooks (in order of execution):**
- `UserPromptSubmit` → `solve-trigger.sh` — detects `/solve` invocations, initialises a fresh tree state, registers the session, starts the visualisation server if not running
- `PostToolUse` → `hook-tool.sh` — advances tree state in real-time by parsing assistant messages from the transcript; surfaces errors as `additionalContext`
- `PreToolUse` (Edit/Write/MultiEdit) → `hook-edit.sh` — blocks file edits until the tree's status is `resolved`
- `PostToolUseFailure` (Bash) → `hook-bash-fail.sh` — re-triggers solve on Bash failures during implementation
- `Stop` → `hook-stop.sh` — validates completeness; blocks the agent from stopping until all solutions are settled

**Parser:** `scripts/solve-tree.js` — reads the transcript JSONL incrementally, processes XML-like tags (`<solution>`, `<investigate>`, `<resolved>`, `<blocked>`, etc.), maintains node state, and auto-detects terminal states (resolved when a solution is selected, blocked when all top-level solutions fail).

**Visualisation:** SvelteKit app (`build/index.js`, built with `@sveltejs/adapter-node`) — SSE-based server at `localhost:7337`, watches tree state files, renders the live solution tree via Svelte components.

## Updating the version

Bump `"version"` in `.claude-plugin/plugin.json`.
