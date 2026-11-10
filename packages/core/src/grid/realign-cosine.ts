// OTOMIX §3.2 · Mother §2.2
import { REALIGN_BEATS } from '../constants/grid';

/**
 * Computes the cosine interpolation correction at a given beat offset
 * during the 4-bar Body-to-Attack realignment.
 *
 * Curve: value(n) = Δφ × (1 - cos(π × n / N)) / 2
 * - n = beatOffset (0 to N, inclusive)
 * - N = REALIGN_BEATS (16 beats = 4 bars)
 * - Returns 0 at n=0, Δφ at n=N, monotonic in between
 * - Mean slope = Δφ / N ≈ 1 ms/beat when Δφ = 16 ms
 *
 * @param beatOffset - Current beat offset into the realignment (0 to 16)
 * @param deltaPhi - Total phase offset Δφ in milliseconds (typically 16 ms)
 * @returns Correction in milliseconds to apply at this beat
 */
export function cosineRealign(beatOffset: number, deltaPhi: number): number {
  const n = Math.max(0, Math.min(beatOffset, REALIGN_BEATS));
  const ratio = n / REALIGN_BEATS;
  return deltaPhi * (1 - Math.cos(Math.PI * ratio)) * 0.5;
}