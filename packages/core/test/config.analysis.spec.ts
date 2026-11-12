import { describe, it, expect } from 'vitest';
import { getAnalysisConfig } from '../src/config/analysis';

describe('AnalysisConfig', () => {
  it('loads the default config with the expected weights', () => {
    const config = getAnalysisConfig();
    expect(config.energy.weights.danceability).toBe(0.25);
    expect(config.energy.weights.onset_rate).toBe(0.15);
    expect(config.energy.weights.kick_strength).toBe(0.15);
    expect(config.energy.weights.spectral_density).toBe(0.10);
    expect(config.energy.weights.loudness_range).toBe(0.05);
    expect(config.energy.weights.rms_energy).toBe(0.10);
    expect(config.energy.weights.dynamic_inverse).toBe(0.10);
    expect(config.energy.weights.spectral_centroid).toBe(0.05);
    expect(config.energy.weights.beat_bass_ratio).toBe(0.05);
    expect(config.energy.maxValues.danceability).toBe(3.0);
  });
});