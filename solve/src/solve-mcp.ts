import { Server }             from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs   from 'fs';
import * as path from 'path';
import type { SolveState, SolveNode, SolutionNode, ProblemNode } from './types.js';

// ── State file lookup ──────────────────────────────────────────────────────────

const PROJECT_DIR   = process.cwd();
const CLAUDE_DIR    = path.join(PROJECT_DIR, '.claude');
const POINTER_FILE  = path.join(CLAUDE_DIR, 'solve_current');

function getSolveId(): string | null {
  try {
    const raw = fs.readFileSync(POINTER_FILE, 'utf8').trim();
    // pointer file may contain "solve_id <transcript_line>" from old hook — take first token
    return raw ? raw.split(/\s+/)[0] : null;
  } catch { return null; }
}

function getTreeFile(solveId?: string): string | null {
  const id = solveId ?? getSolveId();
  return id ? path.join(CLAUDE_DIR, `solve_tree_${id}.json`) : null;
}

function load(): SolveState | null {
  const f = getTreeFile();
  if (!f || !fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8')) as SolveState;
}

function save(state: SolveState): void {
  const f = getTreeFile()!;
  state.updated_at = Date.now() / 1000;
  fs.writeFileSync(f, JSON.stringify(state, null, 2));
}

/** Create a fresh solve session and make it current. Returns the new state. */
function createSession(): SolveState {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const solveId = `${Date.now()}`;
  const state: SolveState = {
    session_id:    solveId,
    cwd:           PROJECT_DIR,
    status:        'solving',
    root_problem:  '',
    root_research: '',
    nodes:         {},
    selected_id:   null,
    compare_text:  null,
    blocked_text:  null,
    updated_at:    Date.now() / 1000,
  };
  const treeFile = path.join(CLAUDE_DIR, `solve_tree_${solveId}.json`);
  fs.writeFileSync(treeFile, JSON.stringify(state, null, 2));
  fs.writeFileSync(POINTER_FILE, solveId + '\n');
  return state;
}

/**
 * Load the current session if it is still solving, or create a fresh one if
 * there is none or the previous one is already finished.
 */
function loadOrCreate(): SolveState {
  const existing = load();
  if (existing && existing.status === 'solving') return existing;
  return createSession();
}

// ── Tree renderer ──────────────────────────────────────────────────────────────

function isSettled(sol: SolutionNode, nodes: Record<string, SolveNode>): boolean {
  if (sol.status === 'resolved' || sol.status === 'failed') return true;
  return Object.values(nodes).some(
    n => n.type === 'problem' && n.parent_solution === sol.id && n.status === 'blocked',
  );
}

function renderTree(state: SolveState): string {
  const { nodes, root_problem, status } = state;
  const lines: string[] = [];

  if (root_problem) lines.push(`Problem: ${root_problem}\n`);

  const all = Object.values(nodes).sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  if (!all.length) {
    lines.push('(no solutions declared yet)');
  } else {
    for (const n of all) {
      const depth  = (n.id.match(/\./g) ?? []).length;
      const pad    = '  '.repeat(depth + 1);
      const prefix = n.type === 'solution'
        ? `${pad}${n.id} [${n.status}] ${n.text.split('\n')[0].slice(0, 60)}`
        : `${pad}${n.id} [${n.status}] (sub-problem: ${n.text.split('\n')[0].slice(0, 50)})`;
      lines.push(prefix);
    }
  }

  const statusLine =
    status === 'resolved' ? 'Status: resolved — edit gate unlocked.' :
    status === 'blocked'  ? 'Status: blocked — all solutions failed.' :
    'Status: solving';
  lines.push(`\n${statusLine}`);

  return lines.join('\n');
}

// ── Completeness check ─────────────────────────────────────────────────────────

function checkCompleteness(state: SolveState): void {
  const { nodes } = state;
  const solutions = Object.values(nodes).filter((n): n is SolutionNode => n.type === 'solution');
  if (!solutions.length) return;

  const topSols     = solutions.filter(n => !n.id.includes('.'));
  const topResolved = topSols.filter(n => n.status === 'resolved');
  const allSettled  = solutions.every(n => isSettled(n, nodes));
  const allTopFailed = topSols.length > 0
    && topSols.every(n => isSettled(n, nodes) && n.status !== 'resolved');

  if (allSettled && topResolved.length > 0) {
    if (topResolved.length === 1 || state.selected_id) state.status = 'resolved';
  } else if (allTopFailed) {
    state.status = 'blocked';
  }
}

// ── Response helpers ───────────────────────────────────────────────────────────

function ok(action: string, state: SolveState): string {
  return `✓ ${action}\n\n${renderTree(state)}`;
}

function fail(message: string): string {
  return `Error: ${message}`;
}

// ── Tool handlers ──────────────────────────────────────────────────────────────

type Args = Record<string, string | undefined>;

function toolSolveProblem({ text, id }: Args): string {
  if (!text) return fail('text is required.');

  let state: SolveState;
  if (!id) {
    // Root problem declaration — resume or create session
    state = loadOrCreate();
    state.root_problem = state.root_problem ? `${state.root_problem}\n${text}` : text;
    save(state);
    return ok('Root problem set.', state);
  }

  state = load()!;
  if (!state) return fail('No active solve session. Call solve_problem (root) first.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);

  if (!state.nodes[id]) {
    const parentSol = id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null;
    if (parentSol && !state.nodes[parentSol])
      return fail(`Parent solution "${parentSol}" not declared. Use solve_declare first.`);
    const node: ProblemNode = {
      type: 'problem', id, parent_solution: parentSol,
      text: '', status: 'pending', research_text: '', blocked_text: null,
    };
    state.nodes[id] = node;
  }
  const node = state.nodes[id];
  if (node.type !== 'problem') return fail(`${id} is a solution node, not a problem.`);
  node.text = node.text ? `${node.text}\n${text}` : text;

  save(state);
  return ok(`Sub-problem ${id} declared.`, state);
}

function toolSolveResearch({ findings, id }: Args): string {
  if (!findings) return fail('findings is required.');

  if (!id) {
    // Root research — resume or create session
    const state = loadOrCreate();
    state.root_research = state.root_research
      ? `${state.root_research}\n${findings}` : findings;
    save(state);
    return ok('Research recorded.', state);
  }

  const state = load();
  if (!state) return fail('No active solve session. Call solve_problem (root) first.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);

  const node = state.nodes[id];
  if (!node || node.type !== 'problem')
    return fail(`No sub-problem "${id}". Declare it with solve_problem first.`);
  if (node.status === 'blocked') return fail(`Problem ${id} is already blocked.`);
  node.research_text = node.research_text
    ? `${node.research_text}\n${findings}` : findings;
  node.status = 'researched';

  save(state);
  return ok('Research recorded.', state);
}

function toolSolveDeclare({ id, text }: Args): string {
  const state = load();
  if (!state) return fail('No active solve session.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);
  if (!id)   return fail('id is required.');
  if (!text) return fail('text is required.');

  if (state.nodes[id]) {
    const node = state.nodes[id];
    if (node.type !== 'solution') return fail(`${id} is already a problem node.`);
    node.text = text;
  } else {
    const parentProb = id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null;
    if (parentProb && !state.nodes[parentProb])
      return fail(`Parent problem "${parentProb}" not declared. Use solve_problem first.`);
    const node: SolutionNode = {
      type: 'solution', id, parent_problem: parentProb,
      text, status: 'pending', investigate_text: '', resolved_text: '',
    };
    state.nodes[id] = node;
  }

  save(state);
  return ok(`Solution ${id} declared.`, state);
}

function toolSolveInvestigate({ id, findings }: Args): string {
  const state = load();
  if (!state) return fail('No active solve session.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);
  if (!id)       return fail('id is required.');
  if (!findings) return fail('findings is required.');

  const node = state.nodes[id];
  if (!node || node.type !== 'solution')
    return fail(`No solution "${id}". Declare it with solve_declare first.`);
  if (node.status === 'resolved') return fail(`Solution ${id} is already resolved.`);
  if (node.status === 'failed')   return fail(`Solution ${id} has already failed.`);

  node.investigate_text = node.investigate_text
    ? `${node.investigate_text}\n${findings}` : findings;
  node.status = 'investigated';

  save(state);
  return ok(`Investigation recorded for solution ${id}.`, state);
}

function toolSolveResolve({ id, text }: Args): string {
  const state = load();
  if (!state) return fail('No active solve session.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);
  if (!id)   return fail('id is required.');
  if (!text) return fail('text is required.');

  const node = state.nodes[id];
  if (!node || node.type !== 'solution')
    return fail(`No solution "${id}". Declare it with solve_declare first.`);
  if (node.status === 'pending')
    return fail(`Solution ${id} has not been investigated. Call solve_investigate first.`);
  if (node.status === 'resolved') return fail(`Solution ${id} is already resolved.`);
  if (node.status === 'failed')   return fail(`Solution ${id} has already failed.`);

  node.resolved_text = text;
  node.status        = 'resolved';
  checkCompleteness(state);

  save(state);
  return ok(`Solution ${id} resolved.`, state);
}

function toolSolveBlock({ id, reason }: Args): string {
  const state = load();
  if (!state) return fail('No active solve session.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);
  if (!id)     return fail('id is required.');
  if (!reason) return fail('reason is required.');

  const node = state.nodes[id];
  if (!node || node.type !== 'problem')
    return fail(`No sub-problem "${id}". Only sub-problems can be blocked.`);
  if (node.status === 'blocked') return fail(`Problem ${id} is already blocked.`);

  node.blocked_text = reason;
  node.status       = 'blocked';

  const parentId = node.parent_solution;
  if (parentId && state.nodes[parentId]) {
    const parent = state.nodes[parentId];
    if (parent.type === 'solution') parent.status = 'failed';
  }

  checkCompleteness(state);
  save(state);
  return ok(
    `Problem ${id} blocked${parentId ? ` — solution ${parentId} has failed` : ''}.`,
    state,
  );
}

function toolSolveCompare({ text }: Args): string {
  const state = load();
  if (!state) return fail('No active solve session.');
  if (!text) return fail('text is required.');
  state.compare_text = text;
  save(state);
  return ok('Comparison recorded.', state);
}

function toolSolveSelect({ id }: Args): string {
  const state = load();
  if (!state) return fail('No active solve session.');
  if (!id) return fail('id is required.');

  const node = state.nodes[id];
  if (!node || node.type !== 'solution') return fail(`No solution "${id}".`);
  if (node.status !== 'resolved')
    return fail(`Solution ${id} is not resolved. Only resolved solutions can be selected.`);

  state.selected_id = id;
  checkCompleteness(state);
  save(state);
  return ok(`Solution ${id} selected.`, state);
}

// ── Tool registry ──────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (args: Args) => string> = {
  solve_problem:     toolSolveProblem,
  solve_research:    toolSolveResearch,
  solve_declare:     toolSolveDeclare,
  solve_investigate: toolSolveInvestigate,
  solve_resolve:     toolSolveResolve,
  solve_block:       toolSolveBlock,
  solve_compare:     toolSolveCompare,
  solve_select:      toolSolveSelect,
};

const TOOL_DEFS = [
  {
    name: 'solve_problem',
    description:
      'Declare or update the problem statement. Omit id for the root problem; ' +
      'provide a dotted id (e.g. "1.1") for a sub-problem discovered while investigating a solution.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Problem description' },
        id:   { type: 'string', description: 'Sub-problem ID (e.g. "1.1"). Omit for root problem.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'solve_research',
    description:
      'Record research findings for the root problem or a sub-problem. ' +
      'Multiple calls append. Marks the sub-problem as researched.',
    inputSchema: {
      type: 'object',
      properties: {
        findings: { type: 'string', description: 'What you found' },
        id:       { type: 'string', description: 'Sub-problem ID. Omit for root-level research.' },
      },
      required: ['findings'],
    },
  },
  {
    name: 'solve_declare',
    description:
      'Declare a solution. Use dotted IDs for sub-solutions under a sub-problem (e.g. "1.1.1"). ' +
      'Declare all plausible solutions before investigating any.',
    inputSchema: {
      type: 'object',
      properties: {
        id:   { type: 'string', description: 'Solution ID (e.g. "1", "2", "1.1.1")' },
        text: { type: 'string', description: 'Brief description of the approach' },
      },
      required: ['id', 'text'],
    },
  },
  {
    name: 'solve_investigate',
    description:
      'Record investigation findings for a solution. Multiple calls append. ' +
      'First call marks the solution as investigated. Must be called before solve_resolve.',
    inputSchema: {
      type: 'object',
      properties: {
        id:       { type: 'string', description: 'Solution ID' },
        findings: { type: 'string', description: 'What you found while investigating' },
      },
      required: ['id', 'findings'],
    },
  },
  {
    name: 'solve_resolve',
    description:
      'Mark a solution as resolved. Requires prior solve_investigate. ' +
      'If this is the only resolved top-level solution, unlocks the edit gate.',
    inputSchema: {
      type: 'object',
      properties: {
        id:   { type: 'string', description: 'Solution ID' },
        text: { type: 'string', description: 'Why this solution works and how to implement it' },
      },
      required: ['id', 'text'],
    },
  },
  {
    name: 'solve_block',
    description:
      'Block a sub-problem (mark it as unresolvable). Automatically fails the parent solution.',
    inputSchema: {
      type: 'object',
      properties: {
        id:     { type: 'string', description: 'Sub-problem ID (dotted, e.g. "1.1")' },
        reason: { type: 'string', description: 'Why this sub-problem cannot be resolved' },
      },
      required: ['id', 'reason'],
    },
  },
  {
    name: 'solve_compare',
    description:
      'Record a comparison between multiple resolved solutions. ' +
      'Required before solve_select when more than one top-level solution is resolved.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Why each losing option loses, why the winner wins' },
      },
      required: ['text'],
    },
  },
  {
    name: 'solve_select',
    description:
      'Select the winning solution when multiple top-level solutions are resolved. Unlocks the edit gate.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the solution to select' },
      },
      required: ['id'],
    },
  },
];

// ── Server ─────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'solve', version: '2.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name    = req.params.name;
  const args    = (req.params.arguments ?? {}) as Args;
  const handler = HANDLERS[name];

  if (!handler) {
    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const result = handler(args);
  const isError = result.startsWith('Error:');
  return {
    content: [{ type: 'text' as const, text: result }],
    isError,
  };
});

const transport = new StdioServerTransport();
server.connect(transport).catch((e: Error) => {
  process.stderr.write(e.message + '\n');
  process.exit(1);
});
