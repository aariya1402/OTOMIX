export interface TransitionWindow {
  /** Inclusive beat index in the vocal map. */
  readonly startBeat: number;
  /** Exclusive beat index in the vocal map. */
  readonly endBeat: number;
}

/**
 * Keep a transition window clear of vocal beats, moving it to the nearest
 * equally sized instrumental window when necessary. Invalid or ambiguous input
 * and maps without a valid instrumental window fail closed with null.
 */
export function gateTransitionWindow(
  window: TransitionWindow,
  vocalMap: readonly number[]
): TransitionWindow | null {
  const { startBeat, endBeat } = window;
  if (
    !Number.isInteger(startBeat) ||
    !Number.isInteger(endBeat) ||
    startBeat < 0 ||
    endBeat <= startBeat ||
    !vocalMap.length ||
    vocalMap.some((value) => value !== 0 && value !== 1)
  ) {
    return null;
  }

  const duration = endBeat - startBeat;
  if (endBeat > vocalMap.length) return null;

  const isInstrumental = (start: number) => {
    for (let beat = start; beat < start + duration; beat++) {
      if (vocalMap[beat] !== 0) return false;
    }
    return true;
  };

  if (isInstrumental(startBeat)) return window;

  const currentCenter = (startBeat + endBeat) / 2;
  let nearestStart = -1;
  let nearestDistance = Infinity;

  for (let start = 0; start <= vocalMap.length - duration; start++) {
    if (!isInstrumental(start)) continue;

    const distance = Math.abs(start + duration / 2 - currentCenter);
    if (distance < nearestDistance || (distance === nearestDistance && start < nearestStart)) {
      nearestStart = start;
      nearestDistance = distance;
    }
  }

  return nearestStart < 0
    ? null
    : { startBeat: nearestStart, endBeat: nearestStart + duration };
}
