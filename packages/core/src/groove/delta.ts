// OTOMIX §3.5 · Mother §2.5
import { BEAT_EPSILON, SWING_MIN, SWING_MAX } from '../constants/grid';

/**
 * Converts swing displacement from beat units to seconds.
 *
 * The swing displacement (Δ_groove) is measured in beats during groove classification.
 * This function converts it to seconds for use in chopping window boundary calculations
 * at the render boundary (P04).
 *
 * @param swingDisplacementBeats - Swing displacement in beats (typically 0.05–0.33)
 * @param bpm - Tempo in beats per minute
 * @returns Boundary shift in seconds
 * @throws RangeError if bpm <= 0 or displacement is outside [SWING_MIN, SWING_MAX] ± BEAT_EPSILON
 *
 * @example
 * swingDeltaSeconds(0.15, 120) // → 0.075
 */
export function swingDeltaSeconds(swingDisplacementBeats: number, bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError('bpm must be a positive finite number');
  }
  if (
    swingDisplacementBeats < SWING_MIN - BEAT_EPSILON ||
    swingDisplacementBeats > SWING_MAX + BEAT_EPSILON
  ) {
    throw new RangeError(
      `swingDisplacementBeats must be within [${SWING_MIN}, ${SWING_MAX}]`
    );
  }
  const beatPeriodSeconds = 60 / bpm;
  return swingDisplacementBeats * beatPeriodSeconds;
}