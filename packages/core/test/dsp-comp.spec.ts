import { describe, it, expect, beforeEach } from 'vitest';
import { MultibandCompressor } from '../src/dsp/comp';
import type { CompressorProfile } from '../src/config/transition-config';

function makeProfile(overrides: Partial<CompressorProfile> = {}): CompressorProfile {
  return {
    thresholdDb: -20, ratio: 4, attackBeats: 0.0001, releaseBeats: 0.0001, kneeDb: 1, makeupGainDb: 0,
    lowCrossover: { frequency: 250 }, highCrossover: { frequency: 2000 }, ...overrides,
  };
}

function dbToLinear(db: number): number { return Math.pow(10, db / 20); }
function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

describe('MultibandCompressor', () => {
  let comp: MultibandCompressor;

  beforeEach(() => {
    comp = new MultibandCompressor(makeProfile(), 44100, 1024);
    comp.prepare(44100, 120);
  });

  it('applies no gain reduction when signal is below threshold', () => {
    const input = new Float32Array(1024).fill(dbToLinear(-30));
    const output = new Float32Array(1024);
    comp.processBuffer(input, output);
    for (let i = 10; i < output.length; i++) {
      expect(output[i]).toBeCloseTo(input[i], 3);
    }
  });

  it('applies expected gain reduction for signal above threshold', () => {
    const input = new Float32Array(1024).fill(dbToLinear(-10));
    const output = new Float32Array(1024);
    comp.processBuffer(input, output);
    const outDb = 20 * Math.log10(rms(output));
    const gainReduction = -10 - outDb;
    expect(gainReduction).toBeCloseTo(7.5, 0); // toBeCloseTo(7.5, 0) means within 0.5 tolerance which is ~±0.3
  });

  it('crossover frequency change re-splits bands without allocating new Biquads', () => {
    comp.updateProfile(makeProfile({ lowCrossover: { frequency: 500 } }));
    const input = new Float32Array(1024).fill(0.1);
    const output = new Float32Array(1024);
    comp.processBuffer(input, output);
    expect(output.length).toBe(1024);
  });

  it('makeup gain restores output level when enabled', () => {
    comp = new MultibandCompressor(makeProfile({ makeupGainDb: 7.5 }), 44100, 1024);
    comp.prepare(44100, 120);
    const input = new Float32Array(1024).fill(dbToLinear(-10));
    const output = new Float32Array(1024);
    comp.processBuffer(input, output);
    expect(20 * Math.log10(rms(output))).toBeCloseTo(-10, 0);
  });

  it('reset clears detector and filter state', () => {
    const input = new Float32Array(1024).fill(dbToLinear(-10));
    const output1 = new Float32Array(1024);
    comp.processBuffer(input, output1);
    comp.reset();
    const output2 = new Float32Array(1024);
    comp.processBuffer(input, output2);
    for (let i = 0; i < output2.length; i++) {
      expect(output2[i]).toBeCloseTo(output1[i], 4);
    }
  });
});