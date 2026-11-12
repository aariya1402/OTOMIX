// OTOMIX §3.4 · Owner decision D7 (2026-11-12)
//
// Rule: "Grid locks to kick. NOT kick to grid."
// During analysis, if drift exists between the detected kick and the
// current grid, the GRID is shifted to match the kick. Never the other
// way around. Runtime realignment (cut / stretch / playbackRate
// micro-adjust to chase the kick) is FORBIDDEN — see
// RUNTIME_REALIGNMENT_ALLOWED below.
//
// Rule 26: shiftBeats is a musical quantity in beat units. The new T0
// is a FILE POSITION (BOUNDARY_IO, seconds) per the tOfI convention.
// This module does NOT compute its own seconds-per-beat conversion for
// musical logic; only the BOUNDARY_IO newT0 uses the beatPeriod derived
// from bpmSeed.
//
// D9: toleranceBeats comes from AnalysisConfig.grid.lockToleranceBeats.

import { getAnalysisConfig } from '../config/analysis';

/**
 * HARD-CODED CONTRACT: runtime realignment is never allowed.
 * Any future code that sets this to true is a red-line violation.
 * This constant exists so that a grep in CI can detect violations.
 */
export const RUNTIME_REALIGNMENT_ALLOWED = false as const;

export interface GridLockInput {
  /** Grid's seed BPM (must be finite, positive). */
  readonly bpmSeed: number;
  /** Grid's T0 (file position in seconds, BOUNDARY_IO). */
  readonly T0: number;
  /** Detected kick times (file positions in seconds). */
  readonly kickTimes: readonly number[];
}

export interface GridLockResult {
  /** Signed shift in beat units (Rule 26). Zero if no kick was found. */
  readonly shiftBeats: number;
  /** New T0 after the shift (file position in seconds, BOUNDARY_IO). */
  readonly newT0: number;
  /** True if |shiftBeats| <= toleranceBeats; false otherwise. */
  readonly withinTolerance: boolean;
}

export function lockGridToKick(input: GridLockInput): GridLockResult {
  const { bpmSeed, T0, kickTimes } = input;

  // Defensive: invalid grid input → no-op
  if (!Number.isFinite(bpmSeed) || bpmSeed <= 0 || !Number.isFinite(T0) || !Array.isArray(kickTimes) || kickTimes.length === 0) {
    return { shiftBeats: 0, newT0: T0, withinTolerance: true };
  }

  const toleranceBeats = getAnalysisConfig().grid.lockToleranceBeats;
  const beatPeriod = 60 / bpmSeed;

  // Use the first kick as the primary anchor.
  const firstKick = kickTimes[0];
  if (!Number.isFinite(firstKick)) {
    return { shiftBeats: 0, newT0: T0, withinTolerance: true };
  }

  // shiftBeats = (kick - T0) in beat units.
  const shiftBeats = (firstKick - T0) / beatPeriod;
  const newT0 = firstKick;
  const withinTolerance = Math.abs(shiftBeats) <= toleranceBeats;

  return { shiftBeats, newT0, withinTolerance };
}