// OTOMIX §3.1 · Mother §2.1
import { PERIOD_MIN, PERIOD_MAX } from '../constants/grid';

/**
 * Constrain a measured period to the spec-mandated range around the seed period.
 *
 * @param measured   Measured period in seconds (from audio analysis)
 * @param seedPeriod Seed period in seconds (60 / seedBPM)
 * @returns Clamped period within [PERIOD_MIN, PERIOD_MAX] × seedPeriod (inclusive)
 *
 * Formula: clamp(measured, seedPeriod × PERIOD_MIN, seedPeriod × PERIOD_MAX)
 */
export function boundPeriod(measured: number, seedPeriod: number): number {
  return Math.max(seedPeriod * PERIOD_MIN, Math.min(seedPeriod * PERIOD_MAX, measured));
}