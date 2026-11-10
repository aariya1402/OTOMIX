// OTOMIX §3.4 · Mother §2.4
// Zero-RAM Pearson correlation over 100 ms low-frequency energy envelopes.

import { PEARSON_WINDOW_MS } from '../constants/timing';

export interface PearsonResult {
  r: number;
  varianceZero: boolean;
}

/**
 * Computes Pearson correlation coefficient between two equal-length arrays.
 * Returns { r: 0, varianceZero: true } if either input has zero variance.
 * Zero-RAM: O(N) time, O(1) auxiliary space, no allocations in hot path.
 */
export function pearsonCorrelation(
  a: Float32Array | readonly number[],
  b: Float32Array | readonly number[]
): PearsonResult {
  if (a.length !== b.length || a.length === 0) {
    return { r: 0, varianceZero: true };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < a.length; i++) {
    const xi = a[i];
    const yi = b[i];
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
  }

  const n = a.length;
  const varX = n * sumX2 - sumX * sumX;
  const varY = n * sumY2 - sumY * sumY;

  if (varX === 0 || varY === 0) {
    return { r: 0, varianceZero: true };
  }

  const cov = n * sumXY - sumX * sumY;
  const r = cov / Math.sqrt(varX * varY);

  return { r: Math.max(-1, Math.min(1, r)), varianceZero: false };
}

export { PEARSON_WINDOW_MS };