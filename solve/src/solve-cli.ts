#!/usr/bin/env node
import * as fs   from 'fs';
import * as path from 'path';
import type { SolveState, SolutionNode } from './types.js';
import { isSettled, treeFilename } from './state.js';

const [,, mode, session, cwd] = process.argv;
if (!mode || !session || !cwd) {
  process.stderr.write(`Usage: solve-cli validate <solve_id> <cwd>\n`);
  process.exit(1);
}

const treeFile = path.join(cwd, '.claude', treeFilename(session));

// ── validate ───────────────────────────────────────────────────────────────────

if (mode === 'validate') {
  if (!fs.existsSync(treeFile)) process.exit(0);

  const state = JSON.parse(fs.readFileSync(treeFile, 'utf8')) as SolveState;
  if (state.status !== 'solving') process.exit(0);

  const { nodes } = state;

  const solutions = Object.values(nodes)
    .filter((n): n is SolutionNode => n.type === 'solution')
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const open = solutions
    .filter(n => !isSettled(n, nodes))
    .map(n => `${n.id} (${n.status})`)
    .join(', ');

  const treeLines = solutions.length
    ? solutions.map(n => {
        const depth = (n.id.match(/\./g) ?? []).length;
        return `${'  '.repeat(depth + 1)}${n.id} [${n.status}]`;
      }).join('\n')
    : '  (no solutions declared yet)';

  const msg = [
    `Open solutions: ${open || 'none declared'}.`,
    `\nCurrent tree:\n${treeLines}`,
    `\nUse the solve MCP tools to continue: solve_declare, solve_research, solve_resolve, or solve_block.`,
  ].join('\n');

  process.stdout.write(msg + '\n');
  process.exit(1);
}

process.stderr.write(`Unknown mode: ${mode}\n`);
process.exit(1);
