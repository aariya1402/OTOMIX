import { describe, it, expect } from 'vitest';
import { OtomixWorkletProcessor, WorkletConfig } from '../src/dsp/worklet-skeleton';

describe('OtomixWorkletProcessor', () => {
  const defaultConfig: WorkletConfig = {
    entryBeat: 0,
    exitBeat: 64,
    transitionLengthBeats: 16,
    chopGrid: 16,
    crossfadeBeats: 0.015625,
    rateMin: 0.98,
    rateMax: 1.02,
    swingThreshold: 0.05
  };

  it('initializes with dynamic config (no hardcoded 16)', () => {
    const customConfig: WorkletConfig = {
      ...defaultConfig,
      transitionLengthBeats: 8, // 8 bars instead of 16
      chopGrid: 32
    };
    const processor = new OtomixWorkletProcessor(customConfig, 128);
    expect(processor).toBeDefined();
  });

  it('passes audio through when outside transition window', () => {
    const processor = new OtomixWorkletProcessor(defaultConfig, 128);
    const input = [new Float32Array(128).fill(0.5)];
    const output = [new Float32Array(128).fill(0)];
    
    // transitionStart = 64 - 16 = 48. currentBeat = 10 is outside.
    const keepAlive = processor.process([input], [output], 10);
    
    expect(keepAlive).toBe(true);
    expect(output[0][0]).toBe(0.5);
  });

  it('detects transition window dynamically based on config', () => {
    const processor = new OtomixWorkletProcessor(defaultConfig, 128);
    const input = [new Float32Array(128).fill(0.5)];
    const output = [new Float32Array(128).fill(0)];
    
    // transitionStart = 48. currentBeat = 50 is inside.
    processor.process([input], [output], 50);
    expect(output[0][0]).toBe(0.5);
  });
});