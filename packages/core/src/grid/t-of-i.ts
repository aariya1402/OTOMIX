// OTOMIX §3.1; §3.10 · Mother §2.1; §2.10
import { BeatIndex } from '../types/beat-index';
import { BPM } from '../types/bpm';

/**
 * Absolute Locked Grid mapping: beat index → absolute timestamp (seconds).
 * 
 * @param i - Target beat index (non-zero; Beat 1 = reference downbeat anchor)
 * @param T0 - Verified time offset of the reference downbeat anchor (seconds)
 * @param bpmSeed - Seed tempo from K-means over local tempo histogram (BPM)
 * @param delta - Continuous drift correction factor Δᵢ (seconds); NOT clamped here
 * @returns Absolute timestamp t(i) in seconds
 * 
 * Formula: t(i) = T0 + n × (60 / bpmSeed) + delta
 * where n = i - 1 for i ≥ 1, n = i for i ≤ -1 (per §3.10)
 */
export function tOfI(i: BeatIndex, T0: number, bpmSeed: BPM, delta: number): number {
  const period = 60 / bpmSeed;
  const n = i >= 1 ? i - 1 : i;  // i is branded number; comparison works at runtime
  return T0 + n * period + delta;
}