import { describe, it, expect } from 'vitest';
import { OtomixProcessor, WorkletConfig } from '../src/processor';

const config: WorkletConfig = {
  chopGrid: 16,
  crossfadeBeats: 0.015625,
  rateMin: 0.98,
  rateMax: 1.02,
  swingThreshold: 0.05,
  entryBeat: 0,
  exitBeat: 64,
  transitionLengthBeats: 64,
};

describe('OtomixProcessor (P04-T03-S01-M01)', () => {
  it('pre-allocated buffer identities stay unchanged across 1000 process() calls', () => {
    const p = new OtomixProcessor(config, 128);

    const before = Object.entries(p as unknown as Record<string, unknown>)
      .filter(([, v]) => v instanceof Float32Array)
      .map(([k, v]) => [k, v as Float32Array] as const);

    expect(before.length).toBeGreaterThan(0);

    const input: Float32Array[][] = [[new Float32Array(128).fill(0.1)]];
    const output: Float32Array[][] = [[new Float32Array(128)]];

    for (let i = 0; i < 1000; i++) {
      p.process(input, output);
    }

    const after = Object.entries(p as unknown as Record<string, unknown>)
      .filter(([, v]) => v instanceof Float32Array)
      .map(([k, v]) => [k, v as Float32Array] as const);

    expect(after.length).toBe(before.length);
    for (const [k, v] of before) {
      const match = after.find(([ak]) => ak === k);
      expect(match).toBeDefined();
      expect(match![1]).toBe(v);
    }
  });
});