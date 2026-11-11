// OTOMIX §3.2 · Mother §2.2
import { REALIGN_BEATS } from '../constants/grid';

/**
 * Computes the 4-bar cosine realignment correction at a given beat offset.
 *
 * @param beatOffset - Position within the 4-bar window [0, REALIGN_BEATS]
 * @param deltaPhiQuanta - Total phase offset to correct, in QUANTA (internal musical domain)
 * @returns Correction at this beat, in QUANTA
 *
 * Formula: value(n) = deltaPhiQuanta × (1 − cos(π × n / N)) / 2, N = REALIGN_BEATS = 16
 */
export function cosineRealign(beatOffset: number, deltaPhiQuanta: number): number {
  const n = Math.max(0, Math.min(beatOffset, REALIGN_BEATS));
  const ratio = n / REALIGN_BEATS;
  return deltaPhiQuanta * (1 - Math.cos(Math.PI * ratio)) * 0.5;
}