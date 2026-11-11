// OTOMIX §3.6 · Mother §2.6
import { DRIFT_THRESHOLD_QUANTA } from '../constants/timing';
import {
  RATE_MIN, RATE_MAX, RATE_SLEW_PER_QUANTA,
  OBSERVER_GAIN_RANGE, OBSERVER_MAX_EXPECTED_DRIFT_QUANTA, QUANTUM_DIVISOR,
} from '../constants/grid';

export function computeNextRate(
  currentRate: number,
  driftQuanta: number,
  dtSeconds: number,
  bpm: number
): number {
  const GAIN_QUANTA = OBSERVER_GAIN_RANGE / (OBSERVER_MAX_EXPECTED_DRIFT_QUANTA - DRIFT_THRESHOLD_QUANTA);
  let desiredRate = 1.0;
  const absDrift = Math.abs(driftQuanta);
  if (absDrift >= DRIFT_THRESHOLD_QUANTA) {
    const excess = absDrift - DRIFT_THRESHOLD_QUANTA;
    const correction = GAIN_QUANTA * excess;
    desiredRate = 1.0 - Math.sign(driftQuanta) * correction;
    if (desiredRate < RATE_MIN) desiredRate = RATE_MIN;
    else if (desiredRate > RATE_MAX) desiredRate = RATE_MAX;
  }
  // Convert dtSeconds (Web Audio frame delta) to quanta at current BPM
  const dtQuanta = dtSeconds * QUANTUM_DIVISOR * bpm / 60;
  const maxSlew = RATE_SLEW_PER_QUANTA * dtQuanta;
  let delta = desiredRate - currentRate;
  if (delta > maxSlew) delta = maxSlew;
  else if (delta < -maxSlew) delta = -maxSlew;
  let newRate = currentRate + delta;
  if (newRate < RATE_MIN) newRate = RATE_MIN;
  else if (newRate > RATE_MAX) newRate = RATE_MAX;
  return newRate;
}