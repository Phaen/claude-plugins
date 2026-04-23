# solve

A Claude Code plugin that enforces structured problem-solving before any code is written. The agent must build a complete solution tree — investigate the problem, declare all solutions, research each one, resolve or block — before the edit gate unlocks.

## What it does

When you invoke `/solve:solve`, Claude must:

1. **State the problem** precisely — current vs expected behaviour
2. **Investigate** the problem with real tool calls before forming opinions
3. **Declare all candidate solutions** upfront — no undeclared options
4. **Research each one** with real tool calls before drawing conclusions
5. **Resolve or block** every solution with explicit reasoning
6. **Select** the winner (or report blocked if nothing works)

Only after a complete, valid tree does the edit gate unlock and Claude may touch files. If a test or build fails during implementation, the gate re-locks and a new solve is required.

A live tree visualisation runs at **http://localhost:7337** and launches automatically when a session starts.

## Install

```
/plugin marketplace add Phaen/claude-plugins
/plugin install solve@Phaen
```

## Usage

```
/solve:solve <problem description>
```

Or just `/solve:solve` with no arguments — Claude will derive the problem from context.

## Tool flow

```
solve_problem(text="what is failing and why")
solve_investigate(findings="what you confirmed by reading files")

solve_declare(id="1", text="approach A")
solve_declare(id="2", text="approach B")

solve_research(id="1", findings="what you verified about approach A")
solve_resolve(id="1", text="why approach A works and how to implement it")

solve_research(id="2", findings="what you verified about approach B")
solve_problem(id="2.1", text="blocker discovered in approach B")
solve_investigate(id="2.1", findings="whether the blocker can be worked around")
solve_block(id="2.1", reason="cannot be resolved")
```

Sub-problems use dotted IDs (`1.1`, `1.1.1`) for nested investigation.

## Structure

```
solve/
├── .claude-plugin/
│   └── plugin.json          # manifest, MCP server, hooks
├── commands/
│   └── solve.md             # /solve:solve command definition
├── scripts/
│   ├── hook-edit.sh         # PreToolUse: block edits until tree resolved
│   └── hook-stop.sh         # Stop: validate tree completeness
├── src/
│   ├── solve-mcp.ts         # MCP server source
│   └── types.ts             # shared types
└── dist/
    └── solve-mcp.cjs        # built MCP server
```

## Author

Pablo Kebees — [github.com/Phaen](https://github.com/Phaen)

## License

MIT
