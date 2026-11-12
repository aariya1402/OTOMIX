// OTOMIX §4.1 — Heap measurement for leak regression.
//
// Spec wording (§4.1): "Leak prevention is verified programmatically via
// `performance.memory` snapshots captured before and after module execution."
//
// `performance.memory` is a Chromium-only API; in Node.js it is `undefined`
// (verified v24.20.0). The semantically equivalent Node-native measurement is
// `v8.getHeapStatistics().used_heap_size`, preceded by a forced GC when
// `--expose-gc` is enabled. This mirrors `scripts/heap-proof.ts` (existing
// repo precedent). No `_S`/`_MS`/`*Seconds` identifiers appear here (Rule 26).

import * as v8 from 'v8';

/**
 * Return the current V8 used heap size in bytes.
 * If `globalThis.gc` is available (test run with `--expose-gc`), force a
 * full GC first so the measurement excludes transient garbage. If not
 * available, measure without forcing (the caller is responsible for the
 * resulting noise; see `leak.spec.ts` precondition).
 */
export function measureHeapBytes(): number {
  const g = (globalThis as { gc?: () => void }).gc;
  if (typeof g === 'function') g();
  return v8.getHeapStatistics().used_heap_size;
}

/**
 * Least-squares slope of `ys` against `x = 0..n-1`.
 * Units: same as `ys` per iteration. Returns 0 for fewer than 2 points.
 */
export function linearSlope(ys: readonly number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const y = ys[i]!;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }
  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return numerator / denominator;
}