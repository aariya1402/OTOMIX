import { describe, it, expect } from 'vitest';
import { LookaheadLimiter } from '../src/dsp/limiter';
import type { AdminTuningConfig } from '../src/config/transition-config';

describe('LookaheadLimiter', () => {
  const baseConfig: AdminTuningConfig = {
    chopGrid: 16, crossfadeBeats: 0.015625, rateMin: 0.98, rateMax: 1.02, swingThreshold: 0.05,
    enableLiveEffects: true
  };

  const params = {
    ceilingDb: -1.0,
    lookaheadSamples: 128,
    attackSamples: 64,
    releaseSamples: 1024,
    firTapCount: 16
  };

  it('bypasses completely when enableLiveEffects=false', () => {
    const bypassedConfig = { ...baseConfig, enableLiveEffects: false };
    const limiter = new LookaheadLimiter(bypassedConfig, params, 44100);
    
    expect(limiter.getLatencySamples()).toBe(0);

    const buffer = new Float32Array([1.5, -1.5]); // Exceeds ceiling
    const original = new Float32Array(buffer);
    
    limiter.processBuffer(buffer);
    
    expect(buffer[0]).toBe(original[0]);
    expect(buffer[1]).toBe(original[1]);
  });

  it('reports latency > 0 when active', () => {
    const limiter = new LookaheadLimiter(baseConfig, params, 44100);
    // latency = 128 (lookahead) + 15 (fir) = 143
    expect(limiter.getLatencySamples()).toBe(143);
  });

  it('limits signals exceeding ceiling', () => {
    const limiter = new LookaheadLimiter(baseConfig, params, 44100);
    const buffer = new Float32Array(500).fill(1.5);
    
    limiter.processBuffer(buffer);
    
    let maxAmp = 0;
    for (let i = 200; i < buffer.length; i++) {
      if (Math.abs(buffer[i]) > maxAmp) maxAmp = Math.abs(buffer[i]);
    }
    
    expect(maxAmp).toBeLessThanOrEqual(Math.pow(10, -1.0 / 20) + 0.05);
  });

  it('resets state', () => {
    const limiter = new LookaheadLimiter(baseConfig, params, 44100);
    limiter.processBuffer(new Float32Array([1.5]));
    limiter.reset();
    // Just checking it doesn't crash
    expect(limiter.getLatencySamples()).toBe(143);
  });
});