// OTOMIX §3.6 · Mother §2.6
import { REALIGN_MAX_SEMITONES, STATIC_GRID_BPM, ANCHOR_SYNC_BARS } from '../constants/grid';

/** 16 bars × 4 beats/bar = 64 beats */
export const OBSERVER_REALIGN_BEATS = ANCHOR_SYNC_BARS * 4;

/**
 * Computes the logarithmic interpolation correction at a given beat offset
 * during the Observer's 16-bar post-transition realignment.
 *
 * Curve: value(n) = Δφ × ln(1 + k × n/N) / ln(1 + k)
 * - n = beatOffset (0 to N, inclusive)
 * - N = OBSERVER_REALIGN_BEATS (64 beats = 16 bars)
 * - k = 3 (chosen so max instantaneous rate deviation induces <0.05 semitones)
 * - Returns 0 at n=0, Δφ at n=N, monotonic in between
 * - Max slope at n=0: f'(0) = k/ln(1+k) ≈ 2.164 < 2.315 (safety margin)
 *
 * @param beatOffset - Current beat offset into the realignment (0 to 64)
 * @param deltaPhi - Total phase offset Δφ in milliseconds (typically 40 ms)
 * @returns Correction in milliseconds to apply at this beat
 */
export function logRealign(beatOffset: number, deltaPhi: number): number {
  const n = Math.max(0, Math.min(beatOffset, OBSERVER_REALIGN_BEATS));
  const ratio = n / OBSERVER_REALIGN_BEATS;
  const k = 3;
  return deltaPhi * Math.log1p(k * ratio) / Math.log1p(k);
}