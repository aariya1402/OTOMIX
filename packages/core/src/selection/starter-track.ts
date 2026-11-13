// OTOMIX §4.9 · Starter Track Selector (P05-ADD-T04-S01-M01)
//
// Rule 25: Prioritizes high intrinsic mixability; never attempts to "fix" a broken track.
// Rule 26: Dimensionless scores only; no time units.
// Depends ONLY on pre-computed mixability and compatibility scores. No raw audio access.

export interface CandidateTrack {
  readonly trackId: string;
  readonly mixabilityScore: number; // [0,1]
  readonly camelotKey: string;
}

export interface StarterTrackOptions {
  readonly minMixability?: number;
  readonly mixabilityWeight?: number;
  readonly compatibilityWeight?: number;
}

export function selectStarterTrack(
  candidates: readonly CandidateTrack[],
  getCompatibility: (trackIdA: string, trackIdB: string) => number,
  options?: StarterTrackOptions
): string | null {
  if (!candidates || candidates.length === 0) return null;

  const minMix = options?.minMixability ?? 0;
  const wMix = options?.mixabilityWeight ?? 0.4;
  const wComp = options?.compatibilityWeight ?? 0.6;

  const eligible = candidates.filter(c => c.mixabilityScore >= minMix);
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0].trackId;

  let bestTrackId = eligible[0].trackId;
  let bestScore = -1;
  let bestMixability = -1;

  for (let i = 0; i < eligible.length; i++) {
    const track = eligible[i];
    let totalComp = 0;
    let count = 0;

    for (let j = 0; j < eligible.length; j++) {
      if (i === j) continue;
      const other = eligible[j];
      const comp = getCompatibility(track.trackId, other.trackId);
      totalComp += comp;
      count++;
    }

    const avgComp = count > 0 ? totalComp / count : 0;
    const combinedScore = (wMix * track.mixabilityScore) + (wComp * avgComp);

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMixability = track.mixabilityScore;
      bestTrackId = track.trackId;
    } else if (combinedScore === bestScore) {
      if (track.mixabilityScore > bestMixability) {
        bestScore = combinedScore;
        bestMixability = track.mixabilityScore;
        bestTrackId = track.trackId;
      } else if (track.mixabilityScore === bestMixability) {
        if (track.trackId < bestTrackId) {
          bestTrackId = track.trackId;
        }
      }
    }
  }

  return bestTrackId;
}