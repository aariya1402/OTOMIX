// OTOMIX §3.4 · Mother §2.4
// Fallback anchor: first transient exceeding -12 dBFS.
// Zero-RAM: O(N) time, O(1) space, no allocations.

import { FALLBACK_TRANSIENT_DBFS } from '../constants/grid';

export interface Transient {
  time: number;
  dbfs: number;
}

export function findFallbackAnchor(transients: readonly Transient[]): number | null {
  for (const t of transients) {
    if (t.dbfs > FALLBACK_TRANSIENT_DBFS) {
      return t.time;
    }
  }
  return null;
}