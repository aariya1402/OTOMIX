import { describe, it, expect } from 'vitest';
import { computeEnergy } from '../src/features/energy';

describe('computeEnergy (9 Factors)', () => {
  it('T1: all-zero features -> raw = 0, stars = 1', () => {
    const r = computeEnergy({});
    expect(r.raw).toBe(0);
    expect(r.stars).toBe(1);
  });

  it('T2: all-max features -> raw = 1, stars = 5', () => {
    const r = computeEnergy({
      danceability: 3.0, onset_rate: 10.0, rms_energy: 0.2,
      dynamic_complexity: 0, spectral_centroid: 5000,
      beats_loudness_band_ratio: [1, 1], kick_strength: 1.0,
      spectral_density: 1.0, loudness_range: 20.0,
    });
    expect(r.raw).toBeCloseTo(1.0, 9);
    expect(r.stars).toBe(5);
  });

  it('T3: only danceability at max -> raw = 0.25', () => {
    expect(computeEnergy({ danceability: 3.0 }).raw).toBeCloseTo(0.25, 9);
  });

  it('T4: only onset_rate at max -> raw = 0.15', () => {
    expect(computeEnergy({ onset_rate: 10.0 }).raw).toBeCloseTo(0.15, 9);
  });

  it('T5: only kick_strength at max -> raw = 0.15', () => {
    expect(computeEnergy({ kick_strength: 1.0 }).raw).toBeCloseTo(0.15, 9);
  });

  it('T6: only spectral_density at max -> raw = 0.10', () => {
    expect(computeEnergy({ spectral_density: 1.0 }).raw).toBeCloseTo(0.10, 9);
  });

  it('T7: only loudness_range at max -> raw = 0.05', () => {
    expect(computeEnergy({ loudness_range: 20.0 }).raw).toBeCloseTo(0.05, 9);
  });

  it('T8: NaN / negative inputs are clamped to 0, stars = 1', () => {
    const r = computeEnergy({
      danceability: NaN, onset_rate: -5, rms_energy: Number.POSITIVE_INFINITY,
      kick_strength: -1, spectral_density: NaN, loudness_range: -10,
    });
    expect(r.raw).toBe(0);
    expect(r.stars).toBe(1);
  });
});