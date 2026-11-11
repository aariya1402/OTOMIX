// OTOMIX §3.1 · Mother §2.1
import { ANCHOR_SYNC_BARS, DRIFT_MAX_QUANTA, QUANTUM_DIVISOR } from '../constants/grid';

/** 16 bars × 4 beats/bar = 64 beats. Derived from ANCHOR_SYNC_BARS. */
export const ANCHOR_SYNC_INTERVAL_BEATS = ANCHOR_SYNC_BARS * 4;

/**
 * Computes the effective drift (Δ) at a specific beat.
 *
 * Model:
 *  - Beat 1 is the reference downbeat (Δ = 0).
 *  - Beats 2..63: linear from 0: Δ = (beat - 1) × driftPerBeat.
 *  - Beat 64 (sync #1): Δ = measured error from beat 1 to beat 64
 *                       = (64 - 1) × driftPerBeat = 63 × driftPerBeat.
 *  - Beats 65..127: piecewise hold at 0.0315.
 *  - Beat 128 (sync #2): Δ = measured error from beat 64 to beat 128
 *                        = (128 - 64) × driftPerBeat = 64 × driftPerBeat = 0.032.
 *  - Beats 129..191: piecewise hold at 0.032.
 *  - Beat 192 (sync #3): Δ = 0.032.
 *  - ...
 *
 * The measured error is the drift accumulated *since the last anchor*.
 * The "held" value between syncs represents the last measured correction.
 *
 * Defensive clamp to ±DRIFT_MAX_S for safety.
 */
export function getSyncedDrift(beat: number, driftPerBeat: number, bpm: number): number {
  if (beat <= 0) return 0;
  if (beat === 1) return 0; // reference downbeat

  const isSyncPoint = beat % ANCHOR_SYNC_INTERVAL_BEATS === 0;
  const cycle = Math.floor((beat - 1) / ANCHOR_SYNC_INTERVAL_BEATS);
  const anchorBeat = cycle === 0 ? 1 : cycle * ANCHOR_SYNC_INTERVAL_BEATS;
  const beatsSinceAnchor = beat - anchorBeat;

  let drift: number;
  if (isSyncPoint) {
    // At sync: measured error = drift from previous anchor to this sync.
    drift = beatsSinceAnchor * driftPerBeat;
  } else if (cycle === 0) {
    // Before first sync: linear from beat 1.
    drift = beatsSinceAnchor * driftPerBeat;
  } else {
    // After first sync: piecewise hold at the previous cycle's measured error.
    const previousMeasured = ANCHOR_SYNC_INTERVAL_BEATS * driftPerBeat;
    drift = previousMeasured;
  }
  const quantumSec = (60 / bpm) / QUANTUM_DIVISOR;
  const driftMaxSec = DRIFT_MAX_QUANTA * quantumSec;
  return Math.max(-driftMaxSec, Math.min(driftMaxSec, drift));
}

/** Simulate drift over [1, totalBeats]. Index 0 = beat 1. */
export function simulateSyncedDrift(totalBeats: number, driftPerBeat: number, bpm: number): number[] {
  const result: number[] = [];
  for (let beat = 1; beat <= totalBeats; beat++) {
    result.push(getSyncedDrift(beat, driftPerBeat, bpm));
  }
  return result;
}

/** Beat indices where anchor sync occurs within [1, maxBeat]. */
export function getSyncPoints(maxBeat: number): number[] {
  const points: number[] = [];
  for (let beat = ANCHOR_SYNC_INTERVAL_BEATS; beat <= maxBeat; beat += ANCHOR_SYNC_INTERVAL_BEATS) {
    points.push(beat);
  }
  return points;
}