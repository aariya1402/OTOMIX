// OTOMIX §4.4 · Nearest Instrumental Block (P05-T03-S01-M04)
//
// Shifts a transition to the nearest contiguous 16-beat block where
// the sum of the binary vocal map (V_map) is zero (i.e., fully instrumental).
//
// Rule 26: beats are used, not seconds.

export function findNearestInstrumentalBlock(
  vocalMap: readonly number[],
  currentBeat: number,
  blockSize: number = 16
): number {
  if (!vocalMap || vocalMap.length < blockSize) return 0;

  let bestShift = 0;
  let minDistance = Infinity;

  // Slide the block across the map
  for (let i = 0; i <= vocalMap.length - blockSize; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += vocalMap[i + j];
    }

    // If the block is fully instrumental (sum = 0)
    if (sum === 0) {
      const shift = i - currentBeat;
      const distance = Math.abs(shift);

      if (distance < minDistance) {
        minDistance = distance;
        bestShift = shift;
      } else if (distance === minDistance) {
        // Tie-breaker: pick the smaller (more negative) shift
        if (shift < bestShift) {
          bestShift = shift;
        }
      }
    }
  }

  return bestShift;
}