// GATE0-P05-M01: Invariant test for weight sums in analysis-config.json
// Normalize Mixability weights so Σ = 1.0 (or document and test the intentional saturation)
// and add an invariant test over analysis-config.json.

import { describe, it, expect } from 'vitest';
import { getAnalysisConfig } from '../src/config/analysis.js';

describe('GATE0-P05-M01: Weight sums in analysis-config.json', () => {
  const cfg = getAnalysisConfig();

  it('mixability weights sum to 1.0 ±1e-9', () => {
    const w = cfg.mixability.weights;
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('energy weights sum to 1.0 ±1e-9', () => {
    const w = cfg.energy.weights;
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('compatibility weights sum to 1.0 ±1e-9', () => {
    const w = cfg.compatibility.weights;
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('all weight values are in [0, 1]', () => {
    const allWeights = [
      ...Object.values(cfg.mixability.weights),
      ...Object.values(cfg.energy.weights),
      ...Object.values(cfg.compatibility.weights),
    ];
    for (const w of allWeights) {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
    }
  });

  it('no weight is NaN or undefined', () => {
    const allWeights = [
      ...Object.values(cfg.mixability.weights),
      ...Object.values(cfg.energy.weights),
      ...Object.values(cfg.compatibility.weights),
    ];
    for (const w of allWeights) {
      expect(Number.isFinite(w)).toBe(true);
    }
  });
});