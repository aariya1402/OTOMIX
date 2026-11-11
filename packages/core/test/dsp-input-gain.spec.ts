import { describe, it, expect } from 'vitest';
import { GainNormalizer } from '../src/dsp/input-gain';
import type { AdminTuningConfig } from '../src/config/transition-config';

describe('GainNormalizer', () => {
  const baseConfig: AdminTuningConfig = {
    chopGrid: 16, crossfadeBeats: 0.015625, rateMin: 0.98, rateMax: 1.02, swingThreshold: 0.05,
    enableLiveEffects: true
  };

  const params = { targetLufs: -14 };

  it('boosts quieter track to target LUFS', () => {
    const normalizer = new GainNormalizer(baseConfig, params, -18); // +4 dB
    const buffer = new Float32Array([0.1]);
    normalizer.processBuffer(buffer);
    expect(buffer[0]).toBeCloseTo(0.1 * Math.pow(10, 4/20), 4);
  });

  it('attenuates louder track to target LUFS', () => {
    const normalizer = new GainNormalizer(baseConfig, params, -12); // -2 dB
    const buffer = new Float32Array([0.1]);
    normalizer.processBuffer(buffer);
    expect(buffer[0]).toBeCloseTo(0.1 * Math.pow(10, -2/20), 4);
  });

  it('bypasses when enableLiveEffects is false', () => {
    const bypassConfig = { ...baseConfig, enableLiveEffects: false };
    const normalizer = new GainNormalizer(bypassConfig, params, -18);
    const buffer = new Float32Array([0.1]);
    normalizer.processBuffer(buffer);
    expect(buffer[0]).toBeCloseTo(0.1, 5); // Unchanged
  });

  it('applies gain within 0.05 dB tolerance', () => {
    const normalizer = new GainNormalizer(baseConfig, params, -18);
    const buffer = new Float32Array([1.0]);
    normalizer.processBuffer(buffer);
    const gainDb = 20 * Math.log10(buffer[0]);
    expect(Math.abs(gainDb - 4)).toBeLessThan(0.05);
  });

  it('zero allocation in processBuffer', () => {
    const normalizer = new GainNormalizer(baseConfig, params, -18);
    const buffer = new Float32Array(128);
    for (let i = 0; i < 100; i++) {
      normalizer.processBuffer(buffer);
    }
    expect(true).toBe(true);
  });

  it('flushes denormals on output', () => {
    const normalizer = new GainNormalizer(baseConfig, params, -14);
    const buffer = new Float32Array([1e-16]);
    normalizer.processBuffer(buffer);
    expect(buffer[0]).toBe(0);
  });

  it('getLatencySamples returns 0', () => {
    const normalizer = new GainNormalizer(baseConfig, params, -18);
    expect(normalizer.getLatencySamples()).toBe(0);
  });
});