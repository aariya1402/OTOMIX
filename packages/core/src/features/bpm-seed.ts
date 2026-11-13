// OTOMIX §3.1, §4.2 · BPM Seed Derivation (P05-T02-S01-M01)
//
// Derives BPM_seed by K-means clustering of the local tempo histogram
// and validates it against the highest structural energy peak.
//
// Rule 26: BPM is dimensionless, no time units.

import { getAnalysisConfig } from '../config/analysis';
import { BPM, BPMResult } from '../types/bpm';

export interface TempoEntry {
  readonly bpm: number;
  readonly weight: number;
}

export interface StructuralEnergyPeak {
  readonly bpm: number;
  readonly strength: number; // [0, 1]
}

export function deriveBpmSeed(
  histogram: readonly TempoEntry[],
  peak: StructuralEnergyPeak
): BPMResult {
  if (!histogram || histogram.length === 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'Empty histogram' };
  }

  const cfg = getAnalysisConfig().tempo;

  // 1. Validate inputs
  for (const entry of histogram) {
    if (!Number.isFinite(entry.bpm) || entry.bpm < 60 || entry.bpm > 200 || entry.weight < 0) {
      return { ok: false, error: 'INVALID_ARGUMENT', message: 'Invalid BPM or weight in histogram' };
    }
  }

  // 2. Prepare data for K-means (sort by BPM)
  const sorted = [...histogram].sort((a, b) => a.bpm - b.bpm);

  // 3. Initialize centroids using quantiles
  let centroids: number[] = [];
  for (let i = 0; i < cfg.k; i++) {
    const qIndex = Math.floor((i + 0.5) * (sorted.length / cfg.k));
    centroids.push(sorted[qIndex].bpm);
  }

  // 4. Lloyd's algorithm (Weighted 1D K-means)
  let iterations = 0;
  let changed = true;

  while (changed && iterations < cfg.maxIterations) {
    changed = false;
    const clusters: TempoEntry[][] = Array.from({ length: cfg.k }, () => []);

    // Assign to nearest centroid
    for (const entry of sorted) {
      let minDist = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < cfg.k; i++) {
        const dist = Math.abs(entry.bpm - centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = i;
        }
      }
      clusters[bestIdx].push(entry);
    }

    // Update centroids
    for (let i = 0; i < cfg.k; i++) {
      const cluster = clusters[i];
      if (cluster.length === 0) continue;

      let totalWeight = 0;
      let weightedSum = 0;
      for (const entry of cluster) {
        totalWeight += entry.weight;
        weightedSum += entry.bpm * entry.weight;
      }

      const newCentroid = totalWeight > 0 ? weightedSum / totalWeight : centroids[i];
      if (Math.abs(newCentroid - centroids[i]) > cfg.epsilon) {
        changed = true;
      }
      centroids[i] = newCentroid;
    }
    iterations++;
  }

  // 5. Select winning cluster (highest total weight)
  const clustersFinal: TempoEntry[][] = Array.from({ length: cfg.k }, () => []);
  for (const entry of sorted) {
    let minDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < cfg.k; i++) {
      const dist = Math.abs(entry.bpm - centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }
    clustersFinal[bestIdx].push(entry);
  }

  let maxWeight = -1;
  let bestCentroid = centroids[0];

  for (let i = 0; i < cfg.k; i++) {
    let w = 0;
    for (const entry of clustersFinal[i]) w += entry.weight;
    if (w > maxWeight) {
      maxWeight = w;
      bestCentroid = centroids[i];
    }
  }

  // 6. Energy-peak validation
  if (peak.strength >= cfg.peakStrengthThreshold) {
    if (Math.abs(bestCentroid - peak.bpm) > cfg.peakToleranceBpm) {
      return {
        ok: false,
        error: 'INVALID_ARGUMENT',
        message: `Cluster centroid ${bestCentroid} contradicts strong energy peak at ${peak.bpm}`,
      };
    }
  }

  // 7. Return validated BPM
  return BPM.parse(Math.round(bestCentroid));
}