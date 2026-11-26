import { CamelotKey } from '@otomix/core';

type StarterWarningTrack = {
  readonly bpm: number;
  readonly camelotKey: string;
};

const STARTER_WARNING_TEMPO_DELTA_PCT = 1;

export function hasStarterTrackWarning(
  starter: StarterWarningTrack | null | undefined,
  adjacentTracks: readonly StarterWarningTrack[]
): boolean {
  if (!starter || !Number.isFinite(starter.bpm) || starter.bpm <= 0) {
    return false;
  }

  const starterKey = CamelotKey.parse(starter.camelotKey);
  if (!starterKey.ok) {
    return false;
  }

  return adjacentTracks.some((neighbor) => {
    const neighborKey = CamelotKey.parse(neighbor.camelotKey);
    if (
      !neighborKey.ok ||
      starterKey.value !== neighborKey.value ||
      !Number.isFinite(neighbor.bpm) ||
      neighbor.bpm <= 0
    ) {
      return false;
    }

    const tempoDeltaPct = (Math.abs(starter.bpm - neighbor.bpm) / neighbor.bpm) * 100;
    return tempoDeltaPct < STARTER_WARNING_TEMPO_DELTA_PCT;
  });
}
