import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

//#region src/lib/server/state.ts
var DATA_DIR = process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), ".claude");
var REGISTRY = path.join(DATA_DIR, "solve_sessions.json");
var listeners = /* @__PURE__ */ new Set();
function loadRegistry() {
	try {
		return JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
	} catch {
		return [];
	}
}
function treeFile(s) {
	return path.join(s.project_path, ".claude", `solve_tree_${s.solve_id}.json`);
}
function loadState(s) {
	try {
		return JSON.parse(fs.readFileSync(treeFile(s), "utf8"));
	} catch {
		return null;
	}
}
function buildPayload() {
	return loadRegistry().map((s) => ({
		solve_id: s.solve_id,
		project_name: s.project_name,
		started_at: s.started_at,
		state: loadState(s)
	})).sort((a, b) => {
		const ta = a.state?.updated_at ?? a.started_at;
		return (b.state?.updated_at ?? b.started_at) - ta;
	});
}
function broadcast(data) {
	for (const cb of listeners) try {
		cb(data);
	} catch {
		listeners.delete(cb);
	}
}
function subscribe(cb) {
	listeners.add(cb);
}
function unsubscribe(cb) {
	listeners.delete(cb);
}
function deleteSession(id) {
	try {
		const sessions = loadRegistry();
		const target = sessions.find((s) => s.solve_id === id);
		const remaining = sessions.filter((s) => s.solve_id !== id);
		fs.writeFileSync(REGISTRY, JSON.stringify(remaining, null, 2));
		if (target) try {
			fs.unlinkSync(treeFile(target));
		} catch {}
		broadcast(buildPayload());
	} catch {}
}
var regMtime = 0;
var fileMtimes = {};
function checkChanges() {
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
var key = "__solve_watcher__";
if (!globalThis[key]) globalThis[key] = setInterval(checkChanges, 200);

export { buildPayload as b, deleteSession as d, subscribe as s, unsubscribe as u };
//# sourceMappingURL=state-BRDE0lKF.js.map
