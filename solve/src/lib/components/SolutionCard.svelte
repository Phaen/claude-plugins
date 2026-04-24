<script lang="ts">
	import { md } from '$lib/highlight.js';
	import ProblemBlock from './ProblemBlock.svelte';
	import SolutionCard from './SolutionCard.svelte';
	import type { SolveNode, SolutionNode } from '$lib/types.js';

	interface Props {
		node: SolutionNode;
		selectedId: string | null;
		nodes: Record<string, SolveNode>;
	}

	let { node, selectedId, nodes }: Props = $props();

	const isSelected = $derived(selectedId === node.id);

	const statusLabel = $derived(
		({ pending: 'pending', researching: 'researching...', researched: 'researched', resolved: 'resolved', failed: 'failed' })[node.status] || node.status
	);

	const subProblems = $derived(
		Object.values(nodes)
			.filter((n) => n.type === 'problem' && n.parent_solution === node.id)
			.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
	);
</script>

<div
	class="sol-card {node.status}"
	class:selected-sol={isSelected}
	id="sol-{node.id}"
>
	<div class="sol-hdr">
		<span class="sol-id">{node.id}</span>
		<span class="sol-txt">{node.text || '...'}</span>
		{#if isSelected}
			<span class="sel-badge">&#9733; selected</span>
		{/if}
		<span class="sol-status {node.status}">
			{#if node.status === 'researching'}<span class="blink"></span>{/if}
			{statusLabel}
		</span>
	</div>

	{#if node.research_text || node.resolved_text}
		<div class="sol-detail">
			{#if node.research_text}
				<div class="detail-sec">
					<div class="detail-lbl">research</div>
					<div class="detail-txt">{@html md(node.research_text)}</div>
				</div>
			{/if}
			{#if node.resolved_text}
				<div class="detail-sec">
					<div class="detail-lbl">resolution</div>
					<div class="detail-txt">{@html md(node.resolved_text)}</div>
				</div>
			{/if}
		</div>
	{/if}

	{#each subProblems as prob (prob.id)}
		{#if prob.type === 'problem'}
			<div class="sub-group">
				<ProblemBlock
					label="sub-problem {prob.id}"
					text={prob.text}
					nodeId={prob.id}
					investigateText={prob.investigate_text}
					blockedText={prob.blocked_text}
				/>
				{#if !prob.blocked_text}
					{@const subSols = Object.values(nodes)
						.filter((n) => n.type === 'solution' && n.parent_problem === prob.id)
						.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))}
					{#each subSols as sol (sol.id)}
						{#if sol.type === 'solution'}
							<SolutionCard node={sol} {selectedId} {nodes} />
						{/if}
					{/each}
				{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.sol-card {
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		overflow: hidden;
		animation: fadein 0.2s ease-out;
		transition:
			border-color 0.3s,
			opacity 0.3s;
	}
	.sol-card.pending {
		border-left: 3px solid var(--overlay);
		opacity: 0.65;
	}
	.sol-card.researching {
		border-left: 3px solid var(--blue);
	}
	.sol-card.researched {
		border-left: 3px solid color-mix(in srgb, var(--blue) 45%, transparent);
	}
	.sol-card.resolved {
		border-left: 3px solid var(--green);
	}
	.sol-card.failed {
		border-left: 3px solid var(--red);
		opacity: 0.45;
	}
	.selected-sol {
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--purple) 35%, transparent);
		border-color: color-mix(in srgb, var(--purple) 50%, transparent);
	}

	.sol-hdr {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
	}
	.sol-id {
		font-size: 10px;
		color: var(--sub);
		min-width: 20px;
	}
	.sol-txt {
		flex: 1;
	}
	.sol-card.failed .sol-txt {
		text-decoration: line-through;
		color: var(--sub);
	}

	.sol-status {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.sol-status.pending {
		color: var(--sub);
	}
	.sol-status.researching {
		color: var(--blue);
	}
	.sol-status.researched {
		color: color-mix(in srgb, var(--blue) 55%, transparent);
	}
	.sol-status.resolved {
		color: var(--green);
	}
	.sol-status.failed {
		color: var(--red);
	}

	.blink {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--blue);
		margin-right: 5px;
		vertical-align: middle;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.sel-badge {
		font-size: 10px;
		color: var(--purple);
		background: color-mix(in srgb, var(--purple) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--purple) 30%, transparent);
		padding: 2px 7px;
		border-radius: 10px;
	}

	.sol-detail {
		border-top: 1px solid var(--border);
		padding: 10px 14px 10px 34px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.detail-sec {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.detail-lbl {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--sub);
	}
	.detail-txt {
		font-size: 12px;
		color: color-mix(in srgb, var(--text) 75%, transparent);
	}

	.sub-group {
		margin-left: 20px;
		margin-top: 4px;
		padding-left: 14px;
		border-left: 1px dashed var(--border);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
