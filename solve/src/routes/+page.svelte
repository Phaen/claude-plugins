<script lang="ts">
	import { onMount } from 'svelte';
	import SessionTab from '$lib/components/SessionTab.svelte';
	import ProblemBlock from '$lib/components/ProblemBlock.svelte';
	import SolutionCard from '$lib/components/SolutionCard.svelte';
	import type { SolveState, SolveNode } from '$lib/types.js';

	interface SessionPayload {
		solve_id: string;
		project_name: string;
		started_at: number;
		state: SolveState | null;
	}

	let allSessions: SessionPayload[] = $state([]);
	let currentId: string | null = $state(null);
	let knownIds = new Set<string>();

	const activeSession = $derived(allSessions.find((s) => s.solve_id === currentId) ?? null);
	const activeState = $derived(activeSession?.state ?? null);
	const topSolutions = $derived(
		activeState
			? Object.values(activeState.nodes)
					.filter((n): n is Extract<SolveNode, { type: 'solution' }> => n.type === 'solution' && !n.parent_problem)
					.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
			: []
	);

	function update(sessions: SessionPayload[]) {
		allSessions = sessions;
		const newIds = sessions.map((s) => s.solve_id);

		const fresh = newIds.find((id) => !knownIds.has(id));
		if (fresh) currentId = fresh;
		newIds.forEach((id) => knownIds.add(id));

		if (!currentId || !newIds.includes(currentId)) currentId = newIds[0] || null;
	}

	function deleteSession(id: string) {
		fetch(`/session/${id}`, { method: 'DELETE' }).catch(() => {});
	}

	onMount(() => {
		fetch('/state')
			.then((r) => r.json())
			.then(update)
			.catch(() => {});

		const es = new EventSource('/events');
		es.onmessage = (e) => {
			try {
				update(JSON.parse(e.data));
			} catch {}
		};
		es.onerror = () => setTimeout(() => location.reload(), 3000);

		return () => es.close();
	});
</script>

<div class="shell">
	<header>
		<span class="logo">
			<img src="/logo.svg" width="14" height="14" alt="" style="display:inline-block;vertical-align:middle;margin-right:5px;margin-bottom:1px" />Solve
		</span>
		<div class="sessions">
			{#each allSessions as session (session.solve_id)}
				<SessionTab
					solveId={session.solve_id}
					projectName={session.project_name}
					status={session.state?.status || 'unknown'}
					active={session.solve_id === currentId}
					onselect={() => (currentId = session.solve_id)}
					ondelete={() => deleteSession(session.solve_id)}
				/>
			{/each}
		</div>
		<a class="shutdown-btn" href="/shutdown" title="Shut down server">&#x23fb;</a>
	</header>

	<div class="main">
		<div class="tree">
			{#if !activeState}
				<p class="empty">Waiting for a solve session...</p>
			{:else}
				{#if activeState.root_problem}
					<ProblemBlock
						label="problem"
						text={activeState.root_problem}
						investigateText={activeState.root_investigate}
					/>
				{/if}

				{#each topSolutions as sol (sol.id)}
					<SolutionCard
						node={sol}
						selectedId={activeState.selected_id}
						nodes={activeState.nodes}
					/>
				{/each}

				{#if activeState.status === 'blocked' && !activeState.selected_id}
					<div class="blocked-block">
						<div class="lbl">all solutions failed</div>
						<div class="txt">{activeState.blocked_text || ''}</div>
					</div>
				{/if}

				{#if !activeState.root_problem && topSolutions.length === 0}
					<p class="empty">Tree is empty...</p>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0;
		padding: 0 24px;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		flex-shrink: 0;
		height: 44px;
		overflow-x: auto;
	}
	.logo {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--sub);
		margin-right: 20px;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.sessions {
		display: flex;
		gap: 2px;
		align-items: center;
	}

	.shutdown-btn {
		margin-left: auto;
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--sub);
		font-size: 16px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		line-height: 1;
		transition: color 0.15s;
		text-decoration: none;
	}
	.shutdown-btn:hover {
		color: var(--red);
	}

	.main {
		flex: 1;
		overflow-y: auto;
		padding: 28px 28px 48px;
	}

	.tree {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.blocked-block {
		padding: 12px 16px;
		border: 1px solid color-mix(in srgb, var(--red) 30%, transparent);
		border-left: 3px solid var(--red);
		border-radius: 6px;
		background: color-mix(in srgb, var(--red) 5%, transparent);
		animation: fadein 0.2s ease-out;
	}
	.blocked-block .lbl {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--red);
		margin-bottom: 4px;
	}

	.empty {
		color: var(--sub);
		font-style: italic;
		padding: 32px 0;
	}
</style>
