// OTOMIX §4.9 · Live Re-evaluation (P05-ADD-T04-S02-M01)
//
// Recomputes compatibility scores ONLY for affected adjacent pairs
// when the user drags and drops tracks to reorder the queue.
//
// Rule 25: If a track falls below minMixability, it is flagged and removed.
//          We NEVER attempt to repair or fix a broken track.
// Rule 26: Dimensionless scores only. No time units.

export interface ReorderResult {
  readonly updatedPlan: readonly string[];
  readonly pairScores: Record<string, number>;
  readonly warnings: string[];
}

export function recomputeOnReorder(
  newOrder: readonly string[],
  getCandidate: (trackId: string) => { mixabilityScore: number; camelotKey: string } | null,
  getCompatibility: (trackIdA: string, trackIdB: string) => number,
  options?: { minMixability?: number }
): ReorderResult {
  if (!newOrder || newOrder.length === 0) {
    return { updatedPlan: [], pairScores: {}, warnings: [] };
  }

  const minMix = options?.minMixability ?? 0;
  const warnings: string[] = [];
  const validPlan: string[] = [];

  for (const trackId of newOrder) {
    const candidate = getCandidate(trackId);
    if (!candidate) {
      warnings.push("Track not found: " + trackId);
      continue;
    }
    if (candidate.mixabilityScore < minMix) {
      warnings.push("Track " + trackId + " removed: mixability (" + candidate.mixabilityScore + ") fell below gate (" + minMix + ").");
      continue;
    }
    validPlan.push(trackId);
  }

  const pairScores: Record<string, number> = {};
  for (let i = 0; i < validPlan.length - 1; i++) {
    const trackA = validPlan[i];
    const trackB = validPlan[i + 1];
    const score = getCompatibility(trackA, trackB);
    pairScores[trackA + ':' + trackB] = score;
  }

  return { updatedPlan: validPlan, pairScores, warnings };
}