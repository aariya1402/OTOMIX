// OTOMIX §4.9 · Transition Node Builder (P08-T04-S02-M04)
// Builds transition nodes dynamically as tracks are added to the queue.
// Rule 26: Dimensionless units only.

export interface TransitionNode {
  fromTrackId: string;
  toTrackId: string;
  plan: TransitionPlanResponse | null;
  status: 'pending' | 'complete' | 'failed';
  reason?: string;
}

export interface TransitionPlanResponse {
  rung: string;
  reason: string;
  tInSeconds: number;
  tOutSeconds: number;
  inBeatIndex: number;
  outBeatIndex: number;
  alignToSeconds: number;
  mappedBpm: number;
  windowBeats: number;
  paddingBeats?: number;
}

export interface TransitionNodeOptions {
  getTrackFeatures: (trackId: string) => { bpm: number; camelotKey: string } | null;
  submitPlan: (fromTrackId: string, toTrackId: string) => Promise<TransitionPlanResponse | null>;
}

export function createTransitionNodeBuilder(opts: TransitionNodeOptions) {
  let nodes: Map<string, TransitionNode> = new Map();
  let orderedTrackIds: string[] = [];

  function addTrack(trackId: string): void {
    if (orderedTrackIds.includes(trackId)) return;
    setTracks([...orderedTrackIds, trackId]);
  }

  function setTracks(trackIds: readonly string[]): void {
    const nextTrackIds = Array.from(new Set(trackIds));
    const nextNodes = new Map<string, TransitionNode>();
    for (let index = 1; index < nextTrackIds.length; index++) {
      const fromTrackId = nextTrackIds[index - 1];
      const toTrackId = nextTrackIds[index];
      if (fromTrackId === undefined || toTrackId === undefined) continue;

      const key = JSON.stringify([fromTrackId, toTrackId]);
      const existingNode = nodes.get(key);
      nextNodes.set(
        key,
        existingNode ?? {
          fromTrackId,
          toTrackId,
          plan: null,
          status: 'pending',
        }
      );
    }
    orderedTrackIds = nextTrackIds;
    nodes = nextNodes;
  }

  async function processAllNodes(): Promise<void> {
    for (const node of nodes.values()) {
      if (node.status === 'pending') {
        try {
          const plan = await opts.submitPlan(node.fromTrackId, node.toTrackId);
          if (plan) {
            node.plan = responseToPlan(plan);
            node.status = 'complete';
          } else {
            node.status = 'failed';
            node.reason = 'No plan returned';
          }
        } catch (err) {
          node.status = 'failed';
          node.reason = err instanceof Error ? err.message : String(err);
        }
      }
    }
  }

  function responseToPlan(response: TransitionPlanResponse): TransitionPlanResponse {
    return {
      rung: response.rung,
      reason: response.reason,
      tInSeconds: response.tInSeconds,
      tOutSeconds: response.tOutSeconds,
      inBeatIndex: response.inBeatIndex,
      outBeatIndex: response.outBeatIndex,
      alignToSeconds: response.alignToSeconds,
      mappedBpm: response.mappedBpm,
      windowBeats: response.windowBeats,
      ...(response.paddingBeats !== undefined ? { paddingBeats: response.paddingBeats } : {}),
    };
  }

  return {
    addTrack,
    setTracks,
    processAllNodes,
    getNode(trackId: string): TransitionNode[] {
      return Array.from(nodes.values()).filter(
        (n) => n.fromTrackId === trackId || n.toTrackId === trackId
      );
    },
    getAllNodes(): TransitionNode[] {
      return Array.from(nodes.values());
    },
    getNodeCount(): number {
      return nodes.size;
    },
  };
}

export type TransitionNodeBuilder = ReturnType<typeof createTransitionNodeBuilder>;
