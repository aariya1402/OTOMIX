import { describe, it, expect } from 'vitest';
import { OtomixWorkletProcessor } from '../src/dsp/worklet-skeleton';
import { AdminTuningConfig } from '../src/config/transition-config';

describe('OtomixWorkletProcessor', () => {
  const mockAdminConfig: AdminTuningConfig = {
    chopGrid: 16,
    crossfadeBeats: 0.015625,
    rateMin: 0.98,
    rateMax: 1.02,
    swingThreshold: 0.05
  };

  it('initializes with admin config', () => {
    const processor = new OtomixWorkletProcessor(mockAdminConfig, 128);
    expect(processor).toBeDefined();
  });

  it('passes audio through when outside transition window', () => {
    const processor = new OtomixWorkletProcessor(mockAdminConfig, 128);
    const input = [new Float32Array(128).fill(0.5)];
    const output = [new Float32Array(128).fill(0)];
    
    // transitionEndBeat = 64, so transition should be near 64.
    const keepAlive = processor.process([input], [output], 10, 64);
    
    expect(keepAlive).toBe(true);
    expect(output[0][0]).toBe(0.5);
  });
});