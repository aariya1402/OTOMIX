// OTOMIX §3.6 · Mother §2.6
import { ANCHOR_SYNC_BARS, LOG_REALIGN_K } from '../constants/grid';

/** 16 bars × 4 beats/bar = 64 beats */
export const OBSERVER_REALIGN_BEATS = ANCHOR_SYNC_BARS * 4;

/**
 * Computes the logarithmic realignment correction at a given beat offset.
 *
 * @param beatOffset - Position within the 16-bar window [0, OBSERVER_REALIGN_BEATS]
 * @param deltaPhiQuanta - Total phase offset to correct, in QUANTA (internal musical domain)
 * @returns Correction at this beat, in QUANTA
 *
 * Formula: value(n) = deltaPhiQuanta × log1p(k × n / N) / log1p(k), N = 64, k = LOG_REALIGN_K
 */
export function logRealign(beatOffset: number, deltaPhiQuanta: number): number {
  const n = Math.max(0, Math.min(beatOffset, OBSERVER_REALIGN_BEATS));
  if (n === 0) return 0;
  const ratio = n / OBSERVER_REALIGN_BEATS;
  return deltaPhiQuanta * Math.log1p(LOG_REALIGN_K * ratio) / Math.log1p(LOG_REALIGN_K);
}