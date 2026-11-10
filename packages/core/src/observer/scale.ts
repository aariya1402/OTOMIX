// OTOMIX §3.6 · Mother §2.6
import { DRIFT_THRESHOLD_MS } from '../constants/timing';
import {
  RATE_MIN, RATE_MAX, RATE_SLEW_PER_S,
  OBSERVER_GAIN_RANGE, OBSERVER_MAX_EXPECTED_DRIFT_MS,
} from '../constants/grid';

const GAIN = (OBSERVER_GAIN_RANGE * 1000) / (OBSERVER_MAX_EXPECTED_DRIFT_MS - DRIFT_THRESHOLD_MS);

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