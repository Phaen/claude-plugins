---
allowed-tools:
  - "mcp__plugin_solve_solve__solve_problem"
  - "mcp__plugin_solve_solve__solve_investigate"
  - "mcp__plugin_solve_solve__solve_declare"
  - "mcp__plugin_solve_solve__solve_research"
  - "mcp__plugin_solve_solve__solve_resolve"
  - "mcp__plugin_solve_solve__solve_block"
  - "mcp__plugin_solve_solve__solve_compare"
  - "mcp__plugin_solve_solve__solve_select"
  - "mcp__plugin_solve_solve__solve_server"
---
# Solve

**Your first action is to call `solve_problem` with a precise problem statement. Do this now — it creates the session and starts the protocol.**

```
solve_problem(text="What is failing. Current behaviour vs expected behaviour. Where the divergence occurs.")
```

The problem is: $ARGUMENTS

If no arguments were given, derive the problem from the current conversation context.

---

## Protocol

You are operating under a structured problem-solving protocol enforced by the solve MCP server. The server tracks every step and will reject shortcuts. There is no internal thinking budget — **all reasoning must be externalised through MCP tool calls**. If it is not in a tool call, it did not happen.

---

### Step 1 — Investigate the problem

Before forming any opinion, **read the relevant files**. Do not guess. Do not assume. Open files, trace call paths, check configs. When done, record everything you found:

```
solve_investigate(findings="Everything you verified by actually reading. What files, what lines, what behaviour you confirmed. The server will reject vague summaries.")
```

This is your externalised thinking. Write it as if a senior engineer will audit your reasoning. Be specific.

---

### Step 2 — Declare every plausible solution

**Before researching any solution**, declare all of them. Do not lead with the one you already suspect and skip the rest. The server knows if you skipped options.

Every approach that could plausibly work gets a slot:

```
solve_declare(id="1", text="specific description of the approach and its core mechanism")
solve_declare(id="2", text="specific description of the approach and its core mechanism")
solve_declare(id="3", text="specific description of the approach and its core mechanism")
```

Three is the minimum for non-trivial problems. If you only see one option, you have not thought hard enough.

---

### Step 3 — Research each solution

For each declared solution, **actually verify it** using tools (Read, Grep, Glob, Bash). Do not reason from memory. Then record your findings:

```
solve_research(id="1", findings="What you verified. What files you read. What the code actually does. Why this approach works or why it has problems. Be concrete — line numbers, function names, specific behaviours.")
```

Multiple calls to `solve_research` on the same solution append — use this to build up your analysis as you dig deeper.

After researching, reach exactly one outcome:

**No blockers found → resolve it:**
```
solve_resolve(id="1", text="Precise explanation of why this solution works and exactly how to implement it. This becomes the implementation plan — it must be specific enough to act on.")
```

**A genuine blocker found → declare it as a sub-problem and investigate it:**
```
solve_problem(id="1.1", text="Specific description of what blocks this solution.")
solve_investigate(id="1.1", findings="What you verified about the blocker. Is it fundamental? Is there a workaround?")
```

Then declare sub-solutions and research them the same way (`1.1.1`, `1.1.2`, …):
```
solve_declare(id="1.1.1", text="approach to resolve this sub-problem")
solve_research(id="1.1.1", findings="what you verified")
solve_resolve(id="1.1.1", text="why this resolves the blocker")
```

Or, if the blocker truly cannot be resolved:
```
solve_block(id="1.1", reason="Why this blocker cannot be resolved.")
```

Blocking a sub-problem automatically fails the parent. Move to the next top-level solution.

**Every solution must end in either `resolved` or a `blocked` sub-problem. Leaving solutions in `pending` or `researched` is not permitted.**

---

### Step 4 — Select (only when multiple top-level solutions resolved)

If more than one top-level solution reached `resolved`, compare them before selecting:

```
solve_compare(text="- id 1: loses because [specific reason]\n- id 2: wins because [specific reason]")
solve_select(id="2")
```

The comparison must name concrete trade-offs. "Option 2 is cleaner" is not a reason.

---

### Step 5 — Implement

The tree will show `Status: resolved — edit gate unlocked` when you are cleared to write code. Not before.

Implement exactly the solution you resolved. Do not deviate from it mid-implementation. If you hit a blocker while implementing — a test failure, a build error, an assumption that turned out to be wrong — **stop immediately**. Do not patch around it inline. Re-invoke `/solve` with the new problem. The edit gate re-locks until the new tree is resolved.

---

### All solutions failed

If every top-level solution is blocked, the tree status becomes `blocked`. Stop. Do not edit anything. Report to the user — the tree already explains why each path failed.
