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

    it('limits a 1 kHz sine at +6 dB over the ceiling to <= ceiling', () => {
    const limiter = new LookaheadLimiter(baseConfig, params, 44100);
    const sr = 44100;
    const ceilingLinear = Math.pow(10, params.ceilingDb / 20);
    const amp = ceilingLinear * Math.pow(10, 6 / 20); // +6 dB over ceiling

    const buffer = new Float32Array(8192);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = amp * Math.sin(2 * Math.PI * 1000 * i / sr);
    }

    limiter.processBuffer(buffer);

    // Skip settling region (lookahead + several attack time constants)
    const settle = params.lookaheadSamples + params.attackSamples * 8;
    let peak = 0;
    for (let i = settle; i < buffer.length; i++) {
      const v = Math.abs(buffer[i]);
      if (v > peak) peak = v;
    }
    const peakDb = 20 * Math.log10(peak);
    // Plan: peak must not exceed ceiling (-1.0 dBFS). 0.1 dB margin for one-pole ripple.
    expect(peakDb).toBeLessThanOrEqual(params.ceilingDb + 0.1);
  });
  it('resets state', () => {
    const limiter = new LookaheadLimiter(baseConfig, params, 44100);
    limiter.processBuffer(new Float32Array([1.5]));
    limiter.reset();
    // Just checking it doesn't crash
    expect(limiter.getLatencySamples()).toBe(143);
  });
});