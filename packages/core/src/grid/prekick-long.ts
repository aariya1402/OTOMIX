// OTOMIX 3.10 - Mother 2.10
// First Kick = Beat 1. Grid extends backward in 4-beat bars.
// If (T0 / period) mod 4 = r > 0, red region [0, r*period) is numbered -r..-1.
// If r = 0, red region is empty and Bar 0 starts at 0s.
// No Beat 0; no Beat -4. Max 3 negative beats.

export interface PreKickShiftResult {
  T0: number;
  negativeBeats: number;
  barBoundarySeconds: number;
}

export function shiftT0ToBarBoundary(T0: number, bpmSeed: number): PreKickShiftResult {
  if (T0 < 0) throw new Error('T0 must be >= 0');
  if (bpmSeed <= 0) throw new Error('bpmSeed must be > 0');

  const period = 60 / bpmSeed;
  const totalBeats = Math.round(T0 / period);
  const negativeBeats = totalBeats % 4;
  const fullBars = Math.floor(totalBeats / 4);
  const barBoundarySeconds = T0 - fullBars * 4 * period;

  return { T0, negativeBeats, barBoundarySeconds };
}

export function getNegativeBeatTime(
  negativeIndex: number,
  barBoundarySeconds: number,
  bpmSeed: number
): number {
  if (negativeIndex < -3 || negativeIndex >= 0) {
    throw new Error('negative index must be in [-3, -1]');
  }
  const period = 60 / bpmSeed;
  return barBoundarySeconds + negativeIndex * period;
}
