// OTOMIX §3.4 · Mother §2.4
import { CORR_MIN, SHAPE_VAR_MAX } from '../constants/grid';
import { pearsonCorrelation, PearsonResult } from './pearson';

export type KickClassification = 'ON_BEAT' | 'OFF_BEAT';
export type KickEnvelope = Float32Array;

/**
 * Computes relative peak shape variance between two envelopes.
 * shapeVariance = |candidatePeak - refPeak| / refPeak
 */
export function computeShapeVariance(candidate: KickEnvelope, ref: KickEnvelope): number {
  let candidatePeak = 0;
  let refPeak = 0;
  const len = Math.min(candidate.length, ref.length);
  
  for (let i = 0; i < len; i++) {
    if (candidate[i] > candidatePeak) candidatePeak = candidate[i];
    if (ref[i] > refPeak) refPeak = ref[i];
  }
  
  if (refPeak === 0) return 1;
  return Math.abs(candidatePeak - refPeak) / refPeak;
}

/**
 * Classifies a candidate kick against reference kicks.
 * Returns OFF_BEAT if ANY reference fails correlation or shape variance threshold.
 */
export function classifyKick(
  candidate: KickEnvelope,
  refs: readonly KickEnvelope[]
): KickClassification {
  if (refs.length === 0) return 'OFF_BEAT';
  
  for (const ref of refs) {
    const { r, varianceZero }: PearsonResult = pearsonCorrelation(candidate, ref);
    
    if (varianceZero) return 'OFF_BEAT';
    
    const shapeVariance = computeShapeVariance(candidate, ref);
    
    // Strict comparisons per spec: r < 0.85 OR variance > 0.15 -> OFF_BEAT
    if (r < CORR_MIN || shapeVariance > SHAPE_VAR_MAX) {
      return 'OFF_BEAT';
    }
  }
  
  return 'ON_BEAT';
}