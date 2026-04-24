<script lang="ts">
	import { md } from '$lib/highlight.js';

	interface Props {
		label: string;
		text: string;
		nodeId?: string | null;
		investigateText?: string;
		blockedText?: string | null;
	}

	let { label, text, nodeId = null, investigateText = '', blockedText = null }: Props = $props();
</script>

<div class="problem-block" id={nodeId ? `prob-${nodeId}` : 'prob-root'}>
	<div class="lbl">{label}</div>
	<div class="txt">{@html md(text) || '...'}</div>
	{#if investigateText}
		<div class="problem-section investigate">
			<div class="sec-lbl">investigate</div>
			<div class="sec-txt">{@html md(investigateText)}</div>
		</div>
	{/if}
	{#if blockedText}
		<div class="problem-section blocked">
			<div class="sec-lbl">blocked</div>
			<div class="sec-txt">{@html md(blockedText)}</div>
		</div>
	{/if}
</div>

<style>
	.problem-block {
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-left: 3px solid var(--sky);
		border-radius: 6px;
		background: var(--surface);
		margin-bottom: 4px;
		animation: fadein 0.2s ease-out;
	}
	.lbl {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--sky);
		margin-bottom: 4px;
	}
	.txt {
		color: var(--text);
	}
	.problem-section {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--border);
	}
	.sec-lbl {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-bottom: 3px;
	}
	.investigate .sec-lbl {
		color: var(--sub);
	}
	.blocked .sec-lbl {
		color: var(--red);
	}
	.sec-txt {
		font-size: 12px;
		color: color-mix(in srgb, var(--text) 65%, transparent);
	}
	.blocked .sec-txt {
		color: color-mix(in srgb, var(--red) 80%, transparent);
	}
</style>
