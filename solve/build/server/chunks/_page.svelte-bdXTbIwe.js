import { a2 as ensure_array_like, k as escape_html, a3 as attr_class, a4 as attr, Y as derived, a5 as html, a6 as stringify } from './dev-CFfz7vP7.js';
import hljs from 'highlight.js';
import { Marked } from 'marked';

//#region src/lib/components/SessionTab.svelte
function SessionTab($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { solveId, projectName, status, active} = $$props;
		$$renderer.push(`<div${attr_class("session-tab svelte-4f72rx", void 0, { "active": active })} role="tab" tabindex="0"${attr("aria-selected", active)}><span${attr_class(`dot ${stringify(status)}`, "svelte-4f72rx")}></span> <span class="name svelte-4f72rx">${escape_html(projectName)}</span> <span class="sid svelte-4f72rx">${escape_html(solveId.slice(0, 6))}</span> <span class="del svelte-4f72rx" role="button" tabindex="0" title="Delete session">x</span></div>`);
	});
}
//#endregion
//#region src/lib/highlight.ts
var marked = new Marked({
	renderer: { code({ text, lang }) {
		const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
		return "<pre><code class=\"hljs language-" + language + "\">" + hljs.highlight(text, { language }).value + "</code></pre>";
	} },
	gfm: true,
	breaks: false
});
function md(text) {
	if (!text) return "";
	return marked.parse(text);
}
//#endregion
//#region src/lib/components/ProblemBlock.svelte
function ProblemBlock($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { label, text, nodeId = null, investigateText = "", blockedText = null } = $$props;
		$$renderer.push(`<div class="problem-block svelte-1slkcsc"${attr("id", nodeId ? `prob-${nodeId}` : "prob-root")}><div class="lbl svelte-1slkcsc">${escape_html(label)}</div> <div class="txt svelte-1slkcsc">${html(md(text) || "...")}</div> `);
		if (investigateText) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="problem-section investigate svelte-1slkcsc"><div class="sec-lbl svelte-1slkcsc">investigate</div> <div class="sec-txt svelte-1slkcsc">${html(md(investigateText))}</div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (blockedText) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="problem-section blocked svelte-1slkcsc"><div class="sec-lbl svelte-1slkcsc">blocked</div> <div class="sec-txt svelte-1slkcsc">${html(md(blockedText))}</div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/lib/components/SolutionCard.svelte
function SolutionCard_1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { node, selectedId, nodes } = $$props;
		const isSelected = derived(() => selectedId === node.id);
		const statusLabel = derived(() => ({
			pending: "pending",
			researching: "researching...",
			researched: "researched",
			resolved: "resolved",
			failed: "failed"
		})[node.status] || node.status);
		const subProblems = derived(() => Object.values(nodes).filter((n) => n.type === "problem" && n.parent_solution === node.id).sort((a, b) => a.id.localeCompare(b.id, void 0, { numeric: true })));
		$$renderer.push(`<div${attr_class(`sol-card ${stringify(node.status)}`, "svelte-1bddwhn", { "selected-sol": isSelected() })}${attr("id", `sol-${stringify(node.id)}`)}><div class="sol-hdr svelte-1bddwhn"><span class="sol-id svelte-1bddwhn">${escape_html(node.id)}</span> <span class="sol-txt svelte-1bddwhn">${escape_html(node.text || "...")}</span> `);
		if (isSelected()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="sel-badge svelte-1bddwhn">★ selected</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <span${attr_class(`sol-status ${stringify(node.status)}`, "svelte-1bddwhn")}>`);
		if (node.status === "researching") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="blink svelte-1bddwhn"></span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> ${escape_html(statusLabel())}</span></div> `);
		if (node.research_text || node.resolved_text) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="sol-detail svelte-1bddwhn">`);
			if (node.research_text) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="detail-sec svelte-1bddwhn"><div class="detail-lbl svelte-1bddwhn">research</div> <div class="detail-txt svelte-1bddwhn">${html(md(node.research_text))}</div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (node.resolved_text) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="detail-sec svelte-1bddwhn"><div class="detail-lbl svelte-1bddwhn">resolution</div> <div class="detail-txt svelte-1bddwhn">${html(md(node.resolved_text))}</div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <!--[-->`);
		const each_array = ensure_array_like(subProblems());
		for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
			let prob = each_array[$$index_1];
			if (prob.type === "problem") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="sub-group svelte-1bddwhn">`);
				ProblemBlock($$renderer, {
					label: `sub-problem ${stringify(prob.id)}`,
					text: prob.text,
					nodeId: prob.id,
					investigateText: prob.investigate_text,
					blockedText: prob.blocked_text
				});
				$$renderer.push(`<!----> `);
				if (!prob.blocked_text) {
					$$renderer.push("<!--[0-->");
					const subSols = Object.values(nodes).filter((n) => n.type === "solution" && n.parent_problem === prob.id).sort((a, b) => a.id.localeCompare(b.id, void 0, { numeric: true }));
					$$renderer.push(`<!--[-->`);
					const each_array_1 = ensure_array_like(subSols);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let sol = each_array_1[$$index];
						if (sol.type === "solution") {
							$$renderer.push("<!--[0-->");
							SolutionCard_1($$renderer, {
								node: sol,
								selectedId,
								nodes
							});
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					}
					$$renderer.push(`<!--]-->`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let allSessions = [];
		let currentId = null;
		const activeSession = derived(() => allSessions.find((s) => s.solve_id === currentId) ?? null);
		const activeState = derived(() => activeSession()?.state ?? null);
		const topSolutions = derived(() => activeState() ? Object.values(activeState().nodes).filter((n) => n.type === "solution" && !n.parent_problem).sort((a, b) => a.id.localeCompare(b.id, void 0, { numeric: true })) : []);
		$$renderer.push(`<div class="shell svelte-1uha8ag"><header class="svelte-1uha8ag"><span class="logo svelte-1uha8ag"><img src="/logo.svg" width="14" height="14" alt="" style="display:inline-block;vertical-align:middle;margin-right:5px;margin-bottom:1px"/>Solve</span> <div class="sessions svelte-1uha8ag"><!--[-->`);
		const each_array = ensure_array_like(allSessions);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let session = each_array[$$index];
			SessionTab($$renderer, {
				solveId: session.solve_id,
				projectName: session.project_name,
				status: session.state?.status || "unknown",
				active: session.solve_id === currentId});
		}
		$$renderer.push(`<!--]--></div> <a class="shutdown-btn svelte-1uha8ag" href="/shutdown" title="Shut down server">⏻</a></header> <div class="main svelte-1uha8ag"><div class="tree svelte-1uha8ag">`);
		if (!activeState()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="empty svelte-1uha8ag">Waiting for a solve session...</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			if (activeState().root_problem) {
				$$renderer.push("<!--[0-->");
				ProblemBlock($$renderer, {
					label: "problem",
					text: activeState().root_problem,
					investigateText: activeState().root_investigate
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <!--[-->`);
			const each_array_1 = ensure_array_like(topSolutions());
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let sol = each_array_1[$$index_1];
				SolutionCard_1($$renderer, {
					node: sol,
					selectedId: activeState().selected_id,
					nodes: activeState().nodes
				});
			}
			$$renderer.push(`<!--]--> `);
			if (activeState().status === "blocked" && !activeState().selected_id) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="blocked-block svelte-1uha8ag"><div class="lbl svelte-1uha8ag">all solutions failed</div> <div class="txt">${escape_html(activeState().blocked_text || "")}</div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (!activeState().root_problem && topSolutions().length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="empty svelte-1uha8ag">Tree is empty...</p>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]--></div></div></div>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte-bdXTbIwe.js.map
