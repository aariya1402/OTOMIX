import { describe, it, expect } from 'vitest';
import { computeSliceBoundaries, beatSpanToSamples } from '../src/chop/slice';
import { BEAT_EPSILON } from '../src/constants/grid';

describe('computeSliceBoundaries', () => {
  it('computes boundaries on the 1/16 beat grid', () => {
    const out = new Float32Array(100);
    const count = computeSliceBoundaries(0, 4, 16, out);
    expect(count).toBe(65);
    expect(out[0]).toBeCloseTo(0, 9);
    expect(out[1]).toBeCloseTo(0.0625, 9);
    expect(out[64]).toBeCloseTo(4.0, 9);
  });

  it('computes boundaries on the 1/32 beat grid', () => {
    const out = new Float32Array(100);
    const count = computeSliceBoundaries(0, 1, 32, out);
    expect(count).toBe(33);
    expect(out[1]).toBeCloseTo(0.03125, 9);
    expect(out[32]).toBeCloseTo(1.0, 9);
  });

  it('computes boundaries on the 1/8 beat grid', () => {
    const out = new Float32Array(100);
    const count = computeSliceBoundaries(0, 1, 8, out);
    expect(count).toBe(9);
    expect(out[1]).toBeCloseTo(0.125, 9);
  });

  it('uniform slice widths with no gaps or overlaps', () => {
    const out = new Float32Array(100);
    const count = computeSliceBoundaries(0, 2, 16, out);
    for (let i = 0; i < count - 1; i++) {
      expect(out[i+1] - out[i]).toBeCloseTo(1/16, 9);
    }
  });

  it('zero-length range produces zero slices', () => {
    const out = new Float32Array(100);
    const count = computeSliceBoundaries(2, 2, 16, out);
    expect(count).toBe(1); 
    expect(out[0]).toBe(2);
  });

  it('inverted range throws RangeError', () => {
    const out = new Float32Array(100);
    expect(() => computeSliceBoundaries(2, 1, 16, out)).toThrow(RangeError);
  });

  it('invalid chopGrid denominator throws RangeError', () => {
    const out = new Float32Array(100);
    // @ts-expect-error Testing invalid runtime input
    expect(() => computeSliceBoundaries(0, 1, 10, out)).toThrow(RangeError);
  });

  it('zero-allocation / buffer reuse', () => {
    const out = new Float32Array(100);
    const count1 = computeSliceBoundaries(0, 1, 16, out);
    const count2 = computeSliceBoundaries(0, 1, 16, out);
    expect(count1).toBe(count2);
  });
});

describe('beatSpanToSamples', () => {
  it('converts 4 beats at 120 BPM to 88200 samples', () => {
    const samples = beatSpanToSamples(0, 4, 120, 44100);
    expect(samples).toBe(88200);
  });

  it('converts 1/16 beat at 120 BPM to 1378 samples', () => {
    const samples = beatSpanToSamples(0, 1/16, 120, 44100);
    expect(samples).toBe(1378);
  });
});