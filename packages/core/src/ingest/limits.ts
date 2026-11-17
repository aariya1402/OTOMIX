// OTOMIX §5.2 · Mother §1 · GAP-014 · GAP-017
// Pure size/duration limit check. No I/O, no logging. Shared by the cloud
// wrapper (packages/gateway) and the local wrapper (packages/adapter).

export interface LimitsConfig {
  maxBytes: number;
  maxDurationSec: number;
}

export const DEFAULT_LIMITS: Readonly<LimitsConfig> = Object.freeze({
  maxBytes: 500 * 1024 * 1024,
  maxDurationSec: 4 * 3600,
});

export type LimitReason = 'SIZE' | 'DURATION';

export type LimitCheckResult =
  | { ok: true }
  | { ok: false; reason: LimitReason; limit: number; actual: number };

export function checkLimits(
  declaredSizeBytes: number,
  declaredDurationSec: number,
  config: LimitsConfig = DEFAULT_LIMITS,
): LimitCheckResult {
  if (!Number.isFinite(declaredSizeBytes) || declaredSizeBytes > config.maxBytes) {
    return { ok: false, reason: 'SIZE', limit: config.maxBytes, actual: declaredSizeBytes };
  }
  if (!Number.isFinite(declaredDurationSec) || declaredDurationSec > config.maxDurationSec) {
    return { ok: false, reason: 'DURATION', limit: config.maxDurationSec, actual: declaredDurationSec };
  }
  return { ok: true };
}

export function mergeLimits(partial?: Partial<LimitsConfig>): LimitsConfig {
  if (!partial) return { ...DEFAULT_LIMITS };
  return {
    maxBytes: partial.maxBytes ?? DEFAULT_LIMITS.maxBytes,
    maxDurationSec: partial.maxDurationSec ?? DEFAULT_LIMITS.maxDurationSec,
  };
}