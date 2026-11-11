import { describe, it, expect } from 'vitest';
import { LookaheadLimiter } from '../src/dsp/limiter';
import { GainNormalizer } from '../src/dsp/input-gain';
import type { AdminTuningConfig } from '../src/config/transition-config';

describe('DSP algorithmic latency', () => {
  const config: AdminTuningConfig = {
    enableLiveEffects: true, chopGrid: 8, crossfadeBeats: 0.015625, rateMin: 0.98, rateMax: 1.02, swingThreshold: 0.05,
  };

  it('verifies total latency < 10ms budget (441 samples at 44.1kHz)', () => {
    const limiter = new LookaheadLimiter(config, { ceilingDb: -1.0, lookaheadSamples: 128, attackSamples: 10, releaseSamples: 100, firTapCount: 31 }, 44100);
    const gain = new GainNormalizer(config, { targetLufs: -14 }, -18);
    
    // EQ and Compressor are IIR with 0 latency, so total = limiter + gain + 0 + 0
    const total = limiter.getLatencySamples() + gain.getLatencySamples();
    expect(total).toBeLessThanOrEqual(441);
  });
});