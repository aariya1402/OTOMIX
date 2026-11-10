// OTOMIX §3.6 · Mother §2.6
import { DRIFT_THRESHOLD_MS } from '../constants/timing';
import { RATE_MIN, RATE_MAX, RATE_SLEW_PER_S } from '../constants/grid';

/** Proportional gain so that 50 ms excess drift hits the rate bound. */
const GAIN = (0.02 * 1000) / (50 - DRIFT_THRESHOLD_MS);

/**
 * Computes the next playback rate given current rate, measured drift, and time step.
 *
 * @param currentRate - Current playback rate (clamped to [RATE_MIN, RATE_MAX])
 * @param driftMs - Phase drift in milliseconds (positive = context ahead/fast)
 * @param dtSeconds - Time since last update in seconds
 * @returns New playback rate, slew-limited and clamped to [RATE_MIN, RATE_MAX]
 */
export function computeNextRate(
  currentRate: number,
  driftMs: number,
  dtSeconds: number
): number {
  let desiredRate = 1.0;
  const absDrift = Math.abs(driftMs);
  if (absDrift >= DRIFT_THRESHOLD_MS) {
    const excess = absDrift - DRIFT_THRESHOLD_MS;
    const correction = (GAIN * excess) / 1000;
    desiredRate = 1.0 - Math.sign(driftMs) * correction;
    if (desiredRate < RATE_MIN) desiredRate = RATE_MIN;
    else if (desiredRate > RATE_MAX) desiredRate = RATE_MAX;
  }

  const maxSlew = RATE_SLEW_PER_S * dtSeconds;
  let delta = desiredRate - currentRate;
  if (delta > maxSlew) delta = maxSlew;
  else if (delta < -maxSlew) delta = -maxSlew;

  let newRate = currentRate + delta;
  if (newRate < RATE_MIN) newRate = RATE_MIN;
  else if (newRate > RATE_MAX) newRate = RATE_MAX;

  return newRate;
}