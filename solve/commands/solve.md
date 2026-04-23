---
allowed-tools:
  - "mcp__plugin_solve_solve__solve_research"
  - "mcp__plugin_solve_solve__solve_problem"
  - "mcp__plugin_solve_solve__solve_declare"
  - "mcp__plugin_solve_solve__solve_investigate"
  - "mcp__plugin_solve_solve__solve_resolve"
  - "mcp__plugin_solve_solve__solve_block"
  - "mcp__plugin_solve_solve__solve_compare"
  - "mcp__plugin_solve_solve__solve_select"
  - "mcp__plugin_solve_solve__solve_server"
---
# Solve

Structured problem-solving with an explicit solution tree. Required before implementing any non-trivial fix. Self-invoked when a test, build, or tool failure occurs during implementation.

Use the `solve` MCP tools throughout. Every tool call returns the current tree so you always know where you stand. The edit gate unlocks automatically when the tree reaches `resolved`.

## Problem

$ARGUMENTS

If no arguments given, derive the problem from the current conversation context.

---

## Step 1 — Research

Read every relevant file before articulating the problem. Then record what you found:

```
solve_research(findings="what you confirmed by reading")
solve_problem(text="what is failing. current behaviour vs expected behaviour.")
```

---

## Step 2 — Declare all solutions

Before investigating any, declare every plausible approach. Every option deserves a slot.

```
solve_declare(id="1", text="brief description of approach")
solve_declare(id="2", text="brief description of approach")
solve_declare(id="3", text="brief description of approach")
```

---

## Step 3 — Investigate each solution

For each solution: use tools (Read, Grep, Glob, Bash) to validate it, then record findings. Multiple `solve_investigate` calls on the same solution append — call again if you dig deeper.

```
solve_investigate(id="1", findings="what you found")
```

**Outcome — exactly one of:**

**No blockers → resolve:**
```
solve_resolve(id="1", text="why this works and how to implement it")
```

**Blocker found → declare the sub-problem, research it:**
```
solve_problem(id="1.1", text="description of the blocker")
solve_research(id="1.1", findings="whether it can be worked around")
```

Then either recurse into sub-solutions (`1.1.1`, `1.1.2`, …) or block:
```
solve_block(id="1.1", reason="why this cannot be resolved")
```

Blocking a sub-problem automatically fails the parent solution. Move on to the next top-level solution.

Every solution must end up either `resolved` or with a `blocked` sub-problem.

---

## Step 4 — Select (only when multiple top-level solutions resolved)

```
solve_compare(text="- id X: loses because ...\n- id Y: wins because ...")
solve_select(id="Y")
```

---

## Step 5 — Implement

Once the tree shows `Status: resolved — edit gate unlocked`, proceed with edits.

---

## All solutions failed

If every top-level solution fails, the tree status becomes `blocked`. Stop. Do not edit anything. Report to the user — the tree already shows why each solution failed.

---

## Self-trigger

If during implementation you hit a test failure, build failure, or blocker that invalidates the selected solution — stop immediately. Do not attempt an inline fix. Re-run `/solve` with the new problem. The edit gate re-locks until resolved.
