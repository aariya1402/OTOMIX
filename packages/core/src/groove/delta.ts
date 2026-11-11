// OTOMIX §3.5 · Mother §2.5
import { QUANTUM_DIVISOR, SWING_MIN, SWING_MAX } from '../constants/grid';

/**
 * Converts swing displacement (in beats) to quanta (1 quantum = 1/24 beat).
 * swingDeltaQuanta(0.15) = 0.15 * 24 = 3.6 quanta
 * @throws RangeError if beats is not finite or outside [SWING_MIN, SWING_MAX]
 */
export function swingDeltaQuanta(swingDisplacementBeats: number): number {
  if (!Number.isFinite(swingDisplacementBeats)) {
    throw new RangeError('swing displacement must be a finite number');
  }
  if (swingDisplacementBeats < SWING_MIN || swingDisplacementBeats > SWING_MAX) {
    throw new RangeError('swing displacement must be in [' + SWING_MIN + ', ' + SWING_MAX + ']');
  }
  return swingDisplacementBeats * QUANTUM_DIVISOR;
}