import { describe, it, expect } from 'vitest';
import { applySwingToSliceBoundaries } from '../src/chop/groove-shift';

describe('applySwingToSliceBoundaries', () => {
  it('Straight mode leaves all boundaries unchanged', () => {
    const out = new Float32Array([0, 0.0625, 0.125, 0.1875, 0.25]);
    applySwingToSliceBoundaries(out, 5, 'Straight', 0.15);
    expect(out[1]).toBeCloseTo(0.0625, 9);
    expect(out[3]).toBeCloseTo(0.1875, 9);
  });

  it('Swing mode shifts every second (odd-index) boundary; on-beat unchanged', () => {
    const out = new Float32Array([0, 0.0625, 0.125, 0.1875, 0.25]);
    applySwingToSliceBoundaries(out, 5, 'Swing', 0.15);
    
    // Even indices (on-beats) unchanged
    expect(out[0]).toBeCloseTo(0, 9);
    expect(out[2]).toBeCloseTo(0.125, 9);
    expect(out[4]).toBeCloseTo(0.25, 9);
    
    // Odd indices (off-beats) shifted by 0.15
    expect(out[1]).toBeCloseTo(0.0625 + 0.15, 5);
    expect(out[3]).toBeCloseTo(0.1875 + 0.15, 5);
  });

  it('Triplet mode leaves all boundaries unchanged', () => {
    const out = new Float32Array([0, 0.0625, 0.125]);
    applySwingToSliceBoundaries(out, 3, 'Triplet', 0.15);
    expect(out[1]).toBeCloseTo(0.0625, 9);
  });

  it('Irregular mode leaves all boundaries unchanged', () => {
    const out = new Float32Array([0, 0.0625, 0.125]);
    applySwingToSliceBoundaries(out, 3, 'Irregular', 0.15);
    expect(out[1]).toBeCloseTo(0.0625, 9);
  });

  it('count = 0 and count = 1 mutate nothing', () => {
    const out = new Float32Array([0, 0.0625]);
    applySwingToSliceBoundaries(out, 0, 'Swing', 0.15);
    applySwingToSliceBoundaries(out, 1, 'Swing', 0.15);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0.0625);
  });

  it('Edge: large swing shift may reorder boundaries; arithmetic still applied, no sorting', () => {
    const out = new Float32Array([0, 0.03125, 0.0625]);
    applySwingToSliceBoundaries(out, 3, 'Swing', 0.33);
    expect(out[1]).toBeCloseTo(0.03125 + 0.33, 5);
    // out[1] becomes 0.36125, which is > out[2] (0.0625) — order changed, but arithmetic is correct.
  });

  it('Zero-allocation contract: returns void and mutates the caller buffer in place', () => {
    const out = new Float32Array([0, 0.0625]);
    const ret = applySwingToSliceBoundaries(out, 2, 'Swing', 0.15);
    expect(ret).toBeUndefined();
    expect(out[1]).toBeCloseTo(0.2125, 5);
  });

  it('throws RangeError for invalid count or non-finite swingBeats', () => {
    const out = new Float32Array([0, 0.0625]);
    expect(() => applySwingToSliceBoundaries(out, -1, 'Swing', 0.15)).toThrow(RangeError);
    expect(() => applySwingToSliceBoundaries(out, 3, 'Swing', 0.15)).toThrow(RangeError);
    expect(() => applySwingToSliceBoundaries(out, 2, 'Swing', NaN)).toThrow(RangeError);
    expect(() => applySwingToSliceBoundaries(out, 2, 'Swing', Infinity)).toThrow(RangeError);
  });
});