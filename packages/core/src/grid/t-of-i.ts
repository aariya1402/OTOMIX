// OTOMIX §3.1; §3.10 · Mother §2.1; §2.10
import { BeatIndex } from '../types/beat-index';
import { BPM } from '../types/bpm';
import { DRIFT_MAX_QUANTA, QUANTUM_DIVISOR } from '../constants/grid';

let deltaClampedCount = 0;

export function getDeltaClampedCount(): number {
  return deltaClampedCount;
}

export function resetDeltaClampedCount(): void {
  deltaClampedCount = 0;
}

/**
 * Absolute Locked Grid mapping: beat index → absolute timestamp (seconds).
 *
 * @param i - Target beat index (non-zero; Beat 1 = reference downbeat anchor)
 * @param T0 - Verified time offset of the reference downbeat anchor (seconds)
 * @param bpmSeed - Seed tempo (BPM)
 * @param deltaQuanta - Drift correction in QUANTA (internal musical domain)
 * @returns Absolute timestamp t(i) in seconds
 *
 * Formula: t(i) = T0 + n × (60 / bpmSeed) + deltaQuanta × quantumSeconds(bpmSeed)
 * where n = i - 1 for i ≥ 1, n = i for i ≤ -1 (per §3.10)
 * deltaQuanta is clamped to ±DRIFT_MAX_QUANTA
 */
export function tOfI(i: BeatIndex, T0: number, bpmSeed: BPM, deltaQuanta: number): number {
  const period = 60 / bpmSeed;
  const n = i >= 1 ? i - 1 : i;
  const quantumSec = period / QUANTUM_DIVISOR;

  let clampedQuanta = deltaQuanta;
  if (deltaQuanta > DRIFT_MAX_QUANTA) {
    clampedQuanta = DRIFT_MAX_QUANTA;
    deltaClampedCount++;
  } else if (deltaQuanta < -DRIFT_MAX_QUANTA) {
    clampedQuanta = -DRIFT_MAX_QUANTA;
    deltaClampedCount++;
  }

  return T0 + n * period + clampedQuanta * quantumSec;
}