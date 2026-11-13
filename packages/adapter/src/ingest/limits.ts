// OTOMIX §5.2 · Mother §1 · GAP-014
// Local (on-device) size/duration guard. Uses Blob.size synchronously and the
// declared duration from <audio> metadata (or a caller-supplied number).
// GAP-014: local implementation is independent of the cloud wrapper.

import { checkLimits, mergeLimits, DEFAULT_LIMITS } from '@otomix/core';
import type { LimitsConfig } from '@otomix/core';

export type WarnSink = (record: {
  event: string;
  outcome: string;
  durationMs: number;
  reason: 'SIZE' | 'DURATION';
  limit: number;
  actual: number;
}) => void;

export interface LocalLimitResult {
  ok: boolean;
  reason?: 'SIZE' | 'DURATION';
  limit?: number;
  actual?: number;
}

export function checkLimitsForLocal(
  blob: Blob,
  durationSec: number,
  config?: Partial<LimitsConfig>,
  warn?: WarnSink,
): LocalLimitResult {
  const merged = mergeLimits(config);
  const r = checkLimits(blob.size, durationSec, merged);
  if (!r.ok) {
    const record = {
      event: 'ingest.limit_exceeded',
      outcome: 'failure',
      durationMs: 0,
      reason: r.reason,
      limit: r.limit,
      actual: r.actual,
    };
    if (warn) { warn(record); }
    else if (typeof console !== 'undefined' && console.warn) { console.warn(record); }
    return { ok: false, reason: r.reason, limit: r.limit, actual: r.actual };
  }
  return { ok: true };
}

export { DEFAULT_LIMITS };