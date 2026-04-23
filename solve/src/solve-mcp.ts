import { Server }             from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs            from 'fs';
import * as path          from 'path';
import * as http          from 'http';
import { spawn }          from 'child_process';
import type { SolveState, SolveNode, SolutionNode, ProblemNode } from './types.js';
import { isSettled, treeFilename } from './state.js';

// ── Visualisation server ───────────────────────────────────────────────────────

const VIZ_PORT        = 7337;
const PLUGIN_ROOT     = process.env.CLAUDE_PLUGIN_ROOT ?? '';
const PLUGIN_DATA     = process.env.CLAUDE_PLUGIN_DATA ?? '';

function isVizRunning(): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${VIZ_PORT}/state`, res => {
      res.resume();
      resolve(res.statusCode !== undefined);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => { req.destroy(); resolve(false); });
  });
}

async function ensureVizServer(): Promise<string> {
  if (await isVizRunning()) return `http://localhost:${VIZ_PORT}`;
  if (!PLUGIN_ROOT) return 'Visualisation server not available (CLAUDE_PLUGIN_ROOT unset).';
  const indexJs = path.join(PLUGIN_ROOT, 'build', 'index.js');
  if (!fs.existsSync(indexJs)) return 'Visualisation server not available (build/index.js not found).';
  const child = spawn('node', [indexJs], {
    detached: true,
    stdio:    'ignore',
    env:      { ...process.env, PORT: String(VIZ_PORT), CLAUDE_PLUGIN_DATA: PLUGIN_DATA },
  });
  child.unref();
  return `http://localhost:${VIZ_PORT}`;
}

// ── State file lookup ──────────────────────────────────────────────────────────

const PROJECT_DIR   = process.cwd();
const CLAUDE_DIR    = path.join(PROJECT_DIR, '.claude');
const POINTER_FILE  = path.join(CLAUDE_DIR, 'solve_current');

function getSolveId(): string | null {
  try {
    const raw = fs.readFileSync(POINTER_FILE, 'utf8').trim();
    return raw ? raw.split(/\s+/)[0] : null;
  } catch { return null; }
}

function getTreeFile(solveId?: string): string | null {
  const id = solveId ?? getSolveId();
  return id ? path.join(CLAUDE_DIR, treeFilename(id)) : null;
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
async function createSession(): Promise<SolveState> {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const now     = Date.now();
  const solveId = `${now}`;
  const state: SolveState = {
    session_id:       solveId,
    cwd:              PROJECT_DIR,
    status:           'solving',
    root_problem:     '',
    root_investigate: '',
    nodes:            {},
    selected_id:      null,
    compare_text:     null,
    blocked_text:     null,
    updated_at:       now / 1000,
  };
  const treeFile = path.join(CLAUDE_DIR, treeFilename(solveId));
  fs.writeFileSync(treeFile, JSON.stringify(state, null, 2));
  fs.writeFileSync(POINTER_FILE, solveId + '\n');
  ensureVizServer(); // fire-and-forget
  return state;
}

/**
 * Load the current session if it is still solving, or create a fresh one if
 * there is none or the previous one is already finished.
 */
async function loadOrCreate(): Promise<SolveState> {
  const existing = load();
  if (existing && existing.status === 'solving') return existing;
  return createSession();
}

// ── Tree renderer ──────────────────────────────────────────────────────────────

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

  const topSols      = solutions.filter(n => !n.id.includes('.'));
  const topResolved  = topSols.filter(n => n.status === 'resolved');
  const allSettled   = solutions.every(n => isSettled(n, nodes));
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

async function toolSolveProblem({ text, id }: Args): Promise<string> {
  if (!text) return fail('text is required.');

  let state: SolveState;
  if (!id) {
    state = await loadOrCreate();
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
      text: '', status: 'pending', investigate_text: '', blocked_text: null,
    };
    state.nodes[id] = node;
  }
  const node = state.nodes[id];
  if (node.type !== 'problem') return fail(`${id} is a solution node, not a problem.`);
  node.text = node.text ? `${node.text}\n${text}` : text;

  save(state);
  return ok(`Sub-problem ${id} declared.`, state);
}

// solve_investigate — record findings about the problem (root or sub-problem)
async function toolSolveInvestigate({ findings, id }: Args): Promise<string> {
  if (!findings) return fail('findings is required.');

  if (!id) {
    const state = await loadOrCreate();
    state.root_investigate = state.root_investigate
      ? `${state.root_investigate}\n${findings}` : findings;
    save(state);
    return ok('Investigation recorded.', state);
  }

  const state = load();
  if (!state) return fail('No active solve session. Call solve_problem (root) first.');
  if (state.status !== 'solving') return fail(`Solve is already ${state.status}.`);

  const node = state.nodes[id];
  if (!node || node.type !== 'problem')
    return fail(`No sub-problem "${id}". Declare it with solve_problem first.`);
  if (node.status === 'blocked') return fail(`Problem ${id} is already blocked.`);
  node.investigate_text = node.investigate_text
    ? `${node.investigate_text}\n${findings}` : findings;
  node.status = 'investigated';

  save(state);
  return ok(`Investigation recorded for sub-problem ${id}.`, state);
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
      text, status: 'pending', research_text: '', resolved_text: '',
    };
    state.nodes[id] = node;
  }

  save(state);
  return ok(`Solution ${id} declared.`, state);
}

// solve_research — record findings about a solution
function toolSolveResearch({ id, findings }: Args): string {
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

  node.research_text = node.research_text
    ? `${node.research_text}\n${findings}` : findings;
  node.status = 'researched';

  save(state);
  return ok(`Research recorded for solution ${id}.`, state);
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
    return fail(`Solution ${id} has not been researched. Call solve_research first.`);
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

async function toolSolveServer(_args: Args): Promise<string> {
  const url = await ensureVizServer();
  return url.startsWith('http')
    ? `Visualisation server running at ${url}`
    : url;
}

// ── Tool registry ──────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (args: Args) => string | Promise<string>> = {
  solve_problem:     toolSolveProblem,
  solve_investigate: toolSolveInvestigate,
  solve_declare:     toolSolveDeclare,
  solve_research:    toolSolveResearch,
  solve_resolve:     toolSolveResolve,
  solve_block:       toolSolveBlock,
  solve_compare:     toolSolveCompare,
  solve_select:      toolSolveSelect,
  solve_server:      toolSolveServer,
};

const TOOL_DEFS = [
  {
    name: 'solve_problem',
    description:
      'Declare or update the problem statement. Omit id for the root problem (also creates the session); ' +
      'provide a dotted id (e.g. "1.1") for a sub-problem discovered while researching a solution.',
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
    name: 'solve_investigate',
    description:
      'Record investigation findings about the problem (root or sub-problem). ' +
      'Multiple calls append. Omit id for root-level investigation; pass sub-problem id otherwise.',
    inputSchema: {
      type: 'object',
      properties: {
        findings: { type: 'string', description: 'What you found' },
        id:       { type: 'string', description: 'Sub-problem ID. Omit for root-level investigation.' },
      },
      required: ['findings'],
    },
  },
  {
    name: 'solve_declare',
    description:
      'Declare a solution. Use dotted IDs for sub-solutions under a sub-problem (e.g. "1.1.1"). ' +
      'Declare all plausible solutions before researching any.',
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
    name: 'solve_research',
    description:
      'Record research findings for a solution. Multiple calls append. ' +
      'First call marks the solution as researched. Must be called before solve_resolve.',
    inputSchema: {
      type: 'object',
      properties: {
        id:       { type: 'string', description: 'Solution ID' },
        findings: { type: 'string', description: 'What you found while researching this solution' },
      },
      required: ['id', 'findings'],
    },
  },
  {
    name: 'solve_resolve',
    description:
      'Mark a solution as resolved. Requires prior solve_research. ' +
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
  {
    name: 'solve_server',
    description: 'Start the visualisation server if it is not already running. Returns the URL.',
    inputSchema: { type: 'object', properties: {} },
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

  const result = await handler(args);
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
