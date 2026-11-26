import { getAdjacentTrackPairs } from './client';

export interface TransitionNode {
  readonly id: string;
  readonly fromTrackId: string;
  readonly toTrackId: string;
}

export function getTransitionNodeId(fromTrackId: string, toTrackId: string): string {
  return `transition:${fromTrackId.length}:${fromTrackId}:${toTrackId.length}:${toTrackId}`;
}

/**
 * Derive one transition node for each distinct adjacent track pair.
 * Existing nodes for unchanged pairs are reused so their identity and any
 * consumer-held state survive queue updates.
 */
export function buildTransitionNodes(
  queueIds: readonly string[],
  existingNodes: readonly TransitionNode[] = []
): readonly TransitionNode[] {
  const existingById = new Map(
    existingNodes.map((node) => [node.id, node] as const)
  );
  const seenIds = new Set<string>();
  const nodes: TransitionNode[] = [];

  for (const [fromTrackId, toTrackId] of getAdjacentTrackPairs(queueIds)) {
    const id = getTransitionNodeId(fromTrackId, toTrackId);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const existing = existingById.get(id);
    nodes.push(
      existing &&
        existing.fromTrackId === fromTrackId &&
        existing.toTrackId === toTrackId
        ? existing
        : { id, fromTrackId, toTrackId }
    );
  }

  return nodes;
}
