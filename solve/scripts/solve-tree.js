#!/usr/bin/env node
// solve-tree.js — solve tree state helper for hooks.
//
// Modes:
//   init <session> <cwd>  — initialise a fresh tree state file
//   validate <session> <cwd>  — check completeness; exit 1 with message if still solving

const fs   = require('fs');
const path = require('path');

const [,, mode, session, cwd] = process.argv;
if (!mode || !session || !cwd) {
  process.stderr.write(`Usage: solve-tree.js <init|validate> <session_id> <cwd>\n`);
  process.exit(1);
}

const treeFile = path.join(cwd, '.claude', `solve_tree_${session}.json`);

function save(state) {
  state.updated_at = Date.now() / 1000;
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true });
  fs.writeFileSync(treeFile, JSON.stringify(state, null, 2));
}

// ── init ───────────────────────────────────────────────────────────────────────

if (mode === 'init') {
  save({
    session_id:   session,
    cwd,
    status:       'solving',
    root_problem: '',
    root_research: '',
    nodes:        {},
    selected_id:  null,
    compare_text: null,
    blocked_text: null,
    updated_at:   Date.now() / 1000,
  });
  process.exit(0);
}

// ── validate ───────────────────────────────────────────────────────────────────

if (mode === 'validate') {
  if (!fs.existsSync(treeFile)) process.exit(0);

  const state = JSON.parse(fs.readFileSync(treeFile, 'utf8'));
  if (state.status !== 'solving') process.exit(0);

  const nodes = state.nodes || {};

  function isSettled(sol) {
    if (sol.status === 'resolved' || sol.status === 'failed') return true;
    return Object.values(nodes).some(
      n => n.type === 'problem' && n.parent_solution === sol.id && n.status === 'blocked',
    );
  }

  const solutions = Object.values(nodes)
    .filter(n => n.type === 'solution')
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const open = solutions
    .filter(n => !isSettled(n))
    .map(n => `${n.id} (${n.status})`)
    .join(', ');

  const treeLines = solutions.length
    ? solutions.map(n => {
        const depth = (n.id.match(/\./g) || []).length;
        return `${'  '.repeat(depth + 1)}${n.id} [${n.status}]`;
      }).join('\n')
    : '  (no solutions declared yet)';

  const msg = [
    `Open solutions: ${open || 'none declared'}.`,
    `\nCurrent tree:\n${treeLines}`,
    `\nUse the solve MCP tools to continue: solve_declare, solve_investigate, solve_resolve, or solve_block.`,
  ].join('\n');

  process.stdout.write(msg + '\n');
  process.exit(1);
}

process.stderr.write(`Unknown mode: ${mode}\n`);
process.exit(1);
