// OTOMIX §3.7 · Mother §2.7
// P04-T01-S01-M01: Default glide target computation

/**
 * Computes the default glide target BPM as the arithmetic mean of the
 * outgoing and incoming track BPMs.
 *
 * @param bpmOut - Outgoing track BPM (beats per minute), must be finite and > 0
 * @param bpmIn  - Incoming track BPM (beats per minute), must be finite and > 0
 * @returns The arithmetic average (bpmOut + bpmIn) / 2 as a precise float
 * @throws TypeError if either input is NaN or ±Infinity
 * @throws RangeError if either input is <= 0
 */
export function computeGlideTarget(bpmOut: number, bpmIn: number): number {
  if (!Number.isFinite(bpmOut) || !Number.isFinite(bpmIn)) {
    throw new TypeError('bpmOut and bpmIn must be finite numbers');
  }
  if (bpmOut <= 0 || bpmIn <= 0) {
    throw new RangeError('BPM must be positive');
  }
  return (bpmOut + bpmIn) * 0.5;
}