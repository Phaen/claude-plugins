<script lang="ts">
	interface Props {
		solveId: string;
		projectName: string;
		status: string;
		active: boolean;
		onselect: () => void;
		ondelete: () => void;
	}

	let { solveId, projectName, status, active, onselect, ondelete }: Props = $props();
</script>

<div
	class="session-tab"
	class:active
	role="tab"
	tabindex="0"
	aria-selected={active}
	onclick={onselect}
	onkeydown={(e) => e.key === 'Enter' && onselect()}
>
	<span class="dot {status}"></span>
	<span class="name">{projectName}</span>
	<span class="sid">{solveId.slice(0, 6)}</span>
	<span
		class="del"
		role="button"
		tabindex="0"
		title="Delete session"
		onclick={(e) => {
			e.stopPropagation();
			ondelete();
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				e.stopPropagation();
				ondelete();
			}
		}}>x</span
	>
</div>

<style>
	.session-tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s;
		user-select: none;
	}
	.session-tab:hover {
		background: var(--overlay);
	}
	.session-tab.active {
		background: var(--border);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		transition: background 0.3s;
	}
	.dot.solving {
		background: var(--blue);
		animation: pulse 1.4s ease-in-out infinite;
	}
	.dot.resolved {
		background: var(--green);
	}
	.dot.blocked {
		background: var(--red);
	}
	.dot.unknown {
		background: var(--sub);
	}
	.name {
		font-size: 12px;
		color: var(--text);
	}
	.sid {
		font-size: 10px;
		color: var(--sub);
	}
	.del {
		font-size: 11px;
		color: var(--sub);
		margin-left: 2px;
		padding: 0 2px;
		border-radius: 3px;
		line-height: 1;
	}
	.del:hover {
		color: var(--red);
		background: color-mix(in srgb, var(--red) 15%, transparent);
	}
</style>
