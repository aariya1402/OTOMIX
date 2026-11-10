// OTOMIX §3.1; §3.10 · Mother §2.1; §2.10
import { BeatIndex } from '../types/beat-index';
import { BPM } from '../types/bpm';
import { DRIFT_MAX_S } from '../constants/grid';

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
 * @param bpmSeed - Seed tempo from K-means over local tempo histogram (BPM)
 * @param delta - Continuous drift correction factor Δᵢ (seconds)
 * @returns Absolute timestamp t(i) in seconds
 * 
 * Formula: t(i) = T0 + n × (60 / bpmSeed) + delta
 * where n = i - 1 for i ≥ 1, n = i for i ≤ -1 (per §3.10)
 */
export function tOfI(i: BeatIndex, T0: number, bpmSeed: BPM, delta: number): number {
  const period = 60 / bpmSeed;
  const n = i >= 1 ? i - 1 : i;
  
  // Clamp delta to ±DRIFT_MAX_S per P02-T01-S01-M02
  let clampedDelta = delta;
  if (delta > DRIFT_MAX_S) {
    clampedDelta = DRIFT_MAX_S;
    deltaClampedCount++;
  } else if (delta < -DRIFT_MAX_S) {
    clampedDelta = -DRIFT_MAX_S;
    deltaClampedCount++;
  }
  
  return T0 + n * period + clampedDelta;
}