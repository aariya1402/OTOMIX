import { describe, it, expect } from 'vitest';
import { computeEnergy } from '../src/features/energy';

describe('computeEnergy compression penalty (P05-T02-S02-M03)', () => {
  it('applies a penalty to dynamic_inverse when loudness_range is near-zero (< 3.0)', () => {
    const baseFeatures = {
      danceability: 0.5,
      onset_rate: 5,
      rms_energy: 0.1,
      dynamic_complexity: 20,
      spectral_centroid: 2000,
      beats_loudness_band_ratio: [0.5, 0.5],
      kick_strength: 0.5,
      spectral_density: 0.5,
      loudness_range: 10.0 // Normal dynamic range
    };

    const normal = computeEnergy(baseFeatures);
    
    const compressedFeatures = { ...baseFeatures, loudness_range: 2.0 }; // Over-compressed
    const compressed = computeEnergy(compressedFeatures);

    // The compressed track should have a lower raw energy due to the penalty
    expect(compressed.raw).toBeLessThan(normal.raw);
  });
});