import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SolveState, Session } from '$lib/types.js';

const DATA_DIR = process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), '.claude');
const REGISTRY = path.join(DATA_DIR, 'solve_sessions.json');

type Listener = (data: unknown) => void;
const listeners = new Set<Listener>();

function loadRegistry(): Session[] {
	try {
		return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) as Session[];
	} catch {
		return [];
	}
}

function treeFile(s: Session): string {
	return path.join(s.project_path, '.claude', `solve_tree_${s.solve_id}.json`);
}

function loadState(s: Session): SolveState | null {
	try {
		return JSON.parse(fs.readFileSync(treeFile(s), 'utf8')) as SolveState;
	} catch {
		return null;
	}
}

export function buildPayload() {
	const sessions = loadRegistry();
	return sessions
		.map((s) => ({
			solve_id: s.solve_id,
			project_name: s.project_name,
			started_at: s.started_at,
			state: loadState(s)
		}))
		.sort((a, b) => {
			const ta = a.state?.updated_at ?? a.started_at;
			const tb = b.state?.updated_at ?? b.started_at;
			return tb - ta;
		});
}

function broadcast(data: unknown): void {
	for (const cb of listeners) {
		try {
			cb(data);
		} catch {
			listeners.delete(cb);
		}
	}
}

export function subscribe(cb: Listener): void {
	listeners.add(cb);
}

export function unsubscribe(cb: Listener): void {
	listeners.delete(cb);
}

export function deleteSession(id: string): void {
	try {
		const sessions = loadRegistry();
		const target = sessions.find((s) => s.solve_id === id);
		const remaining = sessions.filter((s) => s.solve_id !== id);
		fs.writeFileSync(REGISTRY, JSON.stringify(remaining, null, 2));
		if (target) {
			try {
				fs.unlinkSync(treeFile(target));
			} catch {}
		}
		broadcast(buildPayload());
	} catch {}
}

// File watcher — polls every 200ms, broadcasts on change
let regMtime = 0;
const fileMtimes: Record<string, number> = {};

function checkChanges(): void {
	let changed = false;
	try {
		const m = fs.statSync(REGISTRY).mtimeMs;
		if (m !== regMtime) {
			regMtime = m;
			changed = true;
		}
	} catch {}

	for (const s of loadRegistry()) {
		const tf = treeFile(s);
		try {
			const m = fs.statSync(tf).mtimeMs;
			if (fileMtimes[s.solve_id] !== m) {
				fileMtimes[s.solve_id] = m;
				changed = true;
			}
		} catch {}
	}

	if (changed) broadcast(buildPayload());
}

// Guard against duplicate intervals in dev HMR
const key = '__solve_watcher__';
if (!(globalThis as Record<string, unknown>)[key]) {
	(globalThis as Record<string, unknown>)[key] = setInterval(checkChanges, 200);
}
