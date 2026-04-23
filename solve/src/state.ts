import type { SolveNode, SolutionNode } from './types.js';

export const treeFilename = (id: string) => `solve_tree_${id}.json`;

export function isSettled(sol: SolutionNode, nodes: Record<string, SolveNode>): boolean {
  if (sol.status === 'resolved' || sol.status === 'failed') return true;
  return Object.values(nodes).some(
    n => n.type === 'problem' && n.parent_solution === sol.id && n.status === 'blocked',
  );
}
