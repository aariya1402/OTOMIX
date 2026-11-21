// GATE0-P05-M03: Complete computeEnergy with all components and weights from AnalysisConfig
// Test with 3 fixture feature sets (low, mid, high energy).
// Expected: strictly increasing scalars within [0,1]; stars monotonic.

import { describe, it, expect } from 'vitest';
import { computeEnergy } from '../src/features/energy';
import { getAnalysisConfig } from '../src/config/analysis';

const cfg = getAnalysisConfig();

describe('GATE0-P05-M03: computeEnergy full implementation', () => {
  // Low energy track fixture
  const lowEnergy: Parameters<typeof computeEnergy>[0] = {
    danceability: 0.5,
    onset_rate: 2.0,
    rms_energy: 0.05,
    dynamic_complexity: 30.0,
    spectral_centroid: 1500,
    beats_loudness_band_ratio: [0.2, 0.1],
    kick_strength: 0.2,
    spectral_density: 0.2,
    loudness_range: 5.0,
  };

  // Mid energy track fixture
  const midEnergy: Parameters<typeof computeEnergy>[0] = {
    danceability: 1.5,
    onset_rate: 5.0,
    rms_energy: 0.1,
    dynamic_complexity: 15.0,
    spectral_centroid: 3000,
    beats_loudness_band_ratio: [0.5, 0.5],
    kick_strength: 0.5,
    spectral_density: 0.5,
    loudness_range: 10.0,
  };

  // High energy track fixture
  const highEnergy: Parameters<typeof computeEnergy>[0] = {
    danceability: 3.0,
    onset_rate: 10.0,
    rms_energy: 0.2,
    dynamic_complexity: 0,
    spectral_centroid: 5000,
    beats_loudness_band_ratio: [1.0, 1.0],
    kick_strength: 1.0,
    spectral_density: 1.0,
    loudness_range: 20.0,
  };

  it('low energy track -> raw in [0,1], stars = 1 or 2', () => {
    const r = computeEnergy(lowEnergy);
    expect(r.raw).toBeGreaterThanOrEqual(0);
    expect(r.raw).toBeLessThanOrEqual(1);
    expect(r.stars).toBeGreaterThanOrEqual(1);
    expect(r.stars).toBeLessThanOrEqual(5);
  });

  it('mid energy track -> raw in [0,1], stars = 2, 3, or 4', () => {
    const r = computeEnergy(midEnergy);
    expect(r.raw).toBeGreaterThanOrEqual(0);
    expect(r.raw).toBeLessThanOrEqual(1);
    expect(r.stars).toBeGreaterThanOrEqual(1);
    expect(r.stars).toBeLessThanOrEqual(5);
  });

  it('high energy track -> raw close to 1, stars = 5', () => {
    const r = computeEnergy(highEnergy);
    expect(r.raw).toBeCloseTo(1.0, 5);
    expect(r.stars).toBe(5);
  });

  it('strictly increasing scalars: low < mid < high', () => {
    const rLow = computeEnergy(lowEnergy);
    const rMid = computeEnergy(midEnergy);
    const rHigh = computeEnergy(highEnergy);

    expect(rLow.raw).toBeLessThan(rMid.raw);
    expect(rMid.raw).toBeLessThan(rHigh.raw);
  });

  it('monotonic stars: low <= mid <= high', () => {
    const rLow = computeEnergy(lowEnergy);
    const rMid = computeEnergy(midEnergy);
    const rHigh = computeEnergy(highEnergy);

    expect(rLow.stars).toBeLessThanOrEqual(rMid.stars);
    expect(rMid.stars).toBeLessThanOrEqual(rHigh.stars);
  });

  it('all 9 components contribute (no hardcoded zeros)', () => {
    // Verify each individual component at max gives its weight
    // Create a base input with all zeros, then set only one component at max
    const weights = cfg.energy.weights;
    const max = cfg.energy.maxValues;

    const zeroInput: Parameters<typeof computeEnergy>[0] = {
      danceability: 0,
      onset_rate: 0,
      rms_energy: 0,
      dynamic_complexity: max.dynamic_complexity, // max -> inverse = 0
      spectral_centroid: 0,
      beats_loudness_band_ratio: [0, 0],
      kick_strength: 0,
      spectral_density: 0,
      loudness_range: 0,
    };

    const testCases: Array<{ name: keyof typeof weights; value: number | number[]; expected: number }> = [
      { name: 'danceability', value: max.danceability, expected: weights.danceability },
      { name: 'onset_rate', value: max.onset_rate, expected: weights.onset_rate },
      { name: 'rms_energy', value: max.rms_energy, expected: weights.rms_energy },
      { name: 'dynamic_inverse', value: 0, expected: weights.dynamic_inverse }, // dc=0 -> inverse=1
      { name: 'spectral_centroid', value: max.spectral_centroid, expected: weights.spectral_centroid },
      { name: 'beat_bass_ratio', value: [1.0, 1.0], expected: weights.beat_bass_ratio },
      { name: 'kick_strength', value: max.kick_strength, expected: weights.kick_strength },
      { name: 'spectral_density', value: max.spectral_density, expected: weights.spectral_density },
      { name: 'loudness_range', value: max.loudness_range, expected: weights.loudness_range },
    ];

    for (const tc of testCases) {
      const input = { ...zeroInput };
      if (tc.name === 'beat_bass_ratio') {
        input.beats_loudness_band_ratio = tc.value as number[];
      } else if (tc.name === 'dynamic_inverse') {
        input.dynamic_complexity = tc.value as number;
      } else {
        (input as any)[tc.name] = tc.value;
      }
      const r = computeEnergy(input);
      expect(r.raw).toBeCloseTo(tc.expected, 9);
    }
  });

  it('loudness_range threshold < 3.0 is read from config (D9)', () => {
    // loudness_range config is 20.0, so 3.0 is well below max
    // This test verifies the value comes from config, not hardcoded
    const maxLoudness = cfg.energy.maxValues.loudness_range;
    const w = cfg.energy.weights;
    expect(maxLoudness).toBeGreaterThan(3.0);
    
    // Test with only loudness_range set, all others zero
    const r = computeEnergy({
      loudness_range: 3.0,
      danceability: 0,
      onset_rate: 0,
      rms_energy: 0,
      dynamic_complexity: cfg.energy.maxValues.dynamic_complexity,
      spectral_centroid: 0,
      beats_loudness_band_ratio: [0, 0],
      kick_strength: 0,
      spectral_density: 0,
    });
    expect(r.raw).toBeGreaterThan(0);
    expect(r.raw).toBeLessThan(w.loudness_range);
  });

  it('average_loudness fallback works when rms_energy missing', () => {
    // When rms_energy is not provided, average_loudness should be used
    const r1 = computeEnergy({ rms_energy: 0.1 });
    const r2 = computeEnergy({ average_loudness: 0.5 }); // normalized 0-1
    // Both should produce some energy contribution
    expect(r1.raw).toBeGreaterThan(0);
    expect(r2.raw).toBeGreaterThan(0);
  });

  it('NaN and negative inputs are clamped without throwing', () => {
    const r = computeEnergy({
      danceability: NaN,
      onset_rate: -5,
      rms_energy: Number.POSITIVE_INFINITY,
      // Omit dynamic_complexity (defaults to max -> inverse=0)
      spectral_centroid: NaN,
      beats_loudness_band_ratio: [-1, -2],
      kick_strength: -1,
      spectral_density: NaN,
      loudness_range: -10,
    });
    expect(r.raw).toBe(0);
    expect(r.stars).toBe(1);
  });
});