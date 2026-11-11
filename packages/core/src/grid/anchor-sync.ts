// OTOMIX §3.1 · Mother §2.1
import { ANCHOR_SYNC_BARS, DRIFT_MAX_QUANTA, QUANTUM_DIVISOR } from '../constants/grid';

/** 16 bars × 4 beats/bar = 64 beats. Derived from ANCHOR_SYNC_BARS. */
export const ANCHOR_SYNC_INTERVAL_BEATS = ANCHOR_SYNC_BARS * 4;

/**
 * Computes the effective drift (Δ) at a specific beat, expressed in QUANTA.
 *
 * @param beat - Beat index (positive)
 * @param driftPerBeat - Measured drift rate in SECONDS per beat (from audio analysis)
 * @param bpm - Tempo (used only for seconds→quanta conversion at this boundary)
 * @returns Clamped drift in QUANTA (internal musical domain), max ±DRIFT_MAX_QUANTA
 *
 * Model:
 *  - Beat 1 is the reference downbeat (Δ = 0).
 *  - Beats 2..63: linear from 0: Δ = (beat - 1) × driftPerBeat (seconds)
 *  - Beat 64 (sync): measured error from beat 1 to beat 64, in seconds
 *  - Beats 65..127: piecewise hold at previous cycle's measured error
 *  - ...
 *
 * Conversion: driftQuanta = driftSeconds / quantumSeconds(bpm)
 * Clamp bound: ±DRIFT_MAX_QUANTA (2.4 quanta = 0.05s at 120 BPM)
 */
export function getSyncedDrift(beat: number, driftPerBeat: number, bpm: number): number {
  if (beat <= 0) return 0;
  if (beat === 1) return 0;

  const isSyncPoint = beat % ANCHOR_SYNC_INTERVAL_BEATS === 0;
  const cycle = Math.floor((beat - 1) / ANCHOR_SYNC_INTERVAL_BEATS);
  const anchorBeat = cycle === 0 ? 1 : cycle * ANCHOR_SYNC_INTERVAL_BEATS;
  const beatsSinceAnchor = beat - anchorBeat;

  let driftSeconds: number;
  if (isSyncPoint) {
    driftSeconds = beatsSinceAnchor * driftPerBeat;
  } else if (cycle === 0) {
    driftSeconds = beatsSinceAnchor * driftPerBeat;
  } else {
    driftSeconds = ANCHOR_SYNC_INTERVAL_BEATS * driftPerBeat;
  }

  // Clamp in seconds (because driftPerBeat is in seconds/beat)
  const quantumSec = (60 / bpm) / QUANTUM_DIVISOR;
  const driftMaxSec = DRIFT_MAX_QUANTA * quantumSec;
  const clampedSec = Math.max(-driftMaxSec, Math.min(driftMaxSec, driftSeconds));

  // Return in quanta
  return clampedSec / quantumSec;
}

/** Simulate drift over [1, totalBeats]. Returns array of quanta. */
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