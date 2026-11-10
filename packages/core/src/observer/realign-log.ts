// OTOMIX §3.6 · Mother §2.6
import { ANCHOR_SYNC_BARS, LOG_REALIGN_K } from '../constants/grid';

/** 16 bars × 4 beats/bar = 64 beats */
export const OBSERVER_REALIGN_BEATS = ANCHOR_SYNC_BARS * 4;

export function logRealign(beatOffset: number, deltaPhi: number): number {
  const n = Math.max(0, Math.min(beatOffset, OBSERVER_REALIGN_BEATS));
  const ratio = n / OBSERVER_REALIGN_BEATS;
  return (deltaPhi * Math.log1p(LOG_REALIGN_K * ratio)) / Math.log1p(LOG_REALIGN_K);
}