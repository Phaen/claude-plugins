# solve

A Claude Code plugin that enforces structured problem-solving before any file edits. The agent must build a complete solution tree — declare all solutions, research each, resolve or block — before the edit gate unlocks.

## How it works

**Entry point:** `commands/solve.md` — the slash command prompt injected when `/solve:solve` is invoked.

**State:** Each solve invocation creates a `solve_tree_<timestamp>.json` in `.claude/` of the project being worked on, with a pointer in `.claude/solve_current`. The tree tracks every solution node (pending → researched → resolved/failed) and sub-problem nodes (pending → investigated → blocked).

**MCP server:** `dist/solve-mcp.cjs` — the core of the plugin. Manages session lifecycle, tree state, and the edit gate. The session is created automatically on the first `solve_problem` or `solve_investigate` call — no separate initialization step.

**Tool flow:**
1. `solve_problem` — declare the root problem (creates session) or a sub-problem (dotted id)
2. `solve_investigate` — record findings about the problem or sub-problem
3. `solve_declare` — declare all plausible solutions before researching any
4. `solve_research` — record findings about a specific solution
5. `solve_resolve` — mark a solution as resolved (requires prior `solve_research`)
6. `solve_block` — mark a sub-problem as unresolvable (fails the parent solution)
7. `solve_compare` — compare multiple resolved solutions (required before `solve_select`)
8. `solve_select` — select the winning solution when multiple are resolved
9. `solve_server` — start the visualisation server manually if it was shut down

**Hooks:**
- `PreToolUse` (Edit/Write/MultiEdit) → `hook-edit.sh` — blocks file edits until tree status is `resolved`
- `Stop` → `hook-stop.sh` — validates completeness; blocks the agent from stopping until all solutions are settled

**Visualisation:** SvelteKit app (`build/index.js`) — SSE-based server at `localhost:7337`, launched automatically when a new session is created. Renders the live solution tree.

## Updating the version

Bump `"version"` in `.claude-plugin/plugin.json` and rebuild with `npm run build:mcp`.
