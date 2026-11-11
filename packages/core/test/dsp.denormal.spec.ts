import { describe, it, expect } from 'vitest';
import { flushDenormal, flushDenormalBuffer, DENORMAL_THRESHOLD } from '../src/dsp/denormal';

describe('flushDenormal', () => {
  it('returns normal numbers unchanged', () => {
    expect(flushDenormal(0.5)).toBe(0.5);
    expect(flushDenormal(-0.1)).toBe(-0.1);
    expect(flushDenormal(1e-10)).toBe(1e-10);
  });

  it('flushes denormal numbers to zero', () => {
    expect(flushDenormal(1e-16)).toBe(0);
    expect(flushDenormal(-1e-16)).toBe(0);
    expect(flushDenormal(1e-30)).toBe(0);
  });

  it('handles the threshold boundary', () => {
    // Math.abs(1e-15) is not strictly less than 1e-15, so it should return 1e-15
    expect(flushDenormal(DENORMAL_THRESHOLD)).toBe(DENORMAL_THRESHOLD);
    expect(flushDenormal(DENORMAL_THRESHOLD * 0.9)).toBe(0);
  });
});

describe('flushDenormalBuffer', () => {
  it('flushes denormals in-place', () => {
    const buffer = new Float32Array([0.5, 1e-16, -1e-16, 0.1, 1e-20]);
    flushDenormalBuffer(buffer);
    
    expect(buffer[0]).toBeCloseTo(0.5, 5);
    expect(buffer[1]).toBe(0);
    expect(buffer[2]).toBe(0);
    expect(buffer[3]).toBeCloseTo(0.1, 5);
    expect(buffer[4]).toBe(0);
  });
});