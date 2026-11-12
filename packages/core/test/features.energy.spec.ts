import { describe, it, expect } from 'vitest';
import { computeEnergy } from '../src/features/energy';

describe('computeEnergy (skeleton)', () => {
  it('T1: all-zero features → raw = 0, stars = 0', () => {
    const r = computeEnergy({});
    expect(r.raw).toBe(0);
    expect(r.stars).toBe(0);
  });

  it('T2: all-max features → raw = 1, stars = 0', () => {
    const r = computeEnergy({
      danceability: 3.0,
      onset_rate: 10.0,
      rms_energy: 0.2,
      dynamic_complexity: 0,
      spectral_centroid: 5000,
      beats_loudness_band_ratio: [1, 1, 0, 0, 0, 0],
    });
    expect(r.raw).toBeCloseTo(1.0, 9);
    expect(r.stars).toBe(0);
  });

  it('T3: only danceability at max → raw ≈ 0.30', () => {
    const r = computeEnergy({ danceability: 3.0 });
    expect(r.raw).toBeCloseTo(0.30, 9);
  });

  it('T4: only onset_rate at max → raw ≈ 0.20', () => {
    const r = computeEnergy({ onset_rate: 10.0 });
    expect(r.raw).toBeCloseTo(0.20, 9);
  });

  it('T5: danceability over max is clamped → raw ≈ 0.30 (not higher)', () => {
    const r = computeEnergy({ danceability: 100 });
    expect(r.raw).toBeCloseTo(0.30, 9);
  });

  it('T6: average_loudness fallback is used when rms_energy is absent', () => {
    const r = computeEnergy({ average_loudness: 1.0 });
    // weight 0.15 × norm 1.0 = 0.15
    expect(r.raw).toBeCloseTo(0.15, 9);
  });

  it('T7: NaN / negative inputs are clamped to 0', () => {
    const r = computeEnergy({
      danceability: NaN,
      onset_rate: -5,
      rms_energy: Number.POSITIVE_INFINITY,
    });
    expect(r.raw).toBe(0);
  });
});