// OTOMIX §3.3 · Quantum timing tests
import { describe, it, expect } from 'vitest';
import { quantumSeconds, quantumIndex } from '../src/timing/quantum';

describe('quantumSeconds', () => {
  it('returns correct quantum duration at 120 BPM', () => {
    expect(quantumSeconds(120)).toBeCloseTo(0.020833333333333332);
  });

  it('returns correct quantum duration at 60 BPM', () => {
    expect(quantumSeconds(60)).toBeCloseTo(0.041666666666666664);
  });

  it('returns correct quantum duration at 180 BPM', () => {
    expect(quantumSeconds(180)).toBeCloseTo(0.013888888888888888);
  });

  it('throws RangeError for bpm <= 0', () => {
    expect(() => quantumSeconds(0)).toThrow(RangeError);
    expect(() => quantumSeconds(-120)).toThrow(RangeError);
  });

  it('throws RangeError for non-finite bpm', () => {
    expect(() => quantumSeconds(NaN)).toThrow(RangeError);
    expect(() => quantumSeconds(Infinity)).toThrow(RangeError);
    expect(() => quantumSeconds(-Infinity)).toThrow(RangeError);
  });
});

describe('quantumIndex', () => {
  it('returns 24 for beatFloat=1.0208', () => {
    expect(quantumIndex(1.0208)).toBe(24);
  });

  it('returns 25 for beatFloat=1.0417', () => {
    expect(quantumIndex(1.0417)).toBe(25);
  });

  it('handles exact beat boundaries', () => {
    expect(quantumIndex(1.0)).toBe(24);   // 1.0 * 24 = 24
    expect(quantumIndex(2.0)).toBe(48);   // 2.0 * 24 = 48
  });

  it('handles negative beatFloat correctly', () => {
    expect(quantumIndex(-1.0)).toBe(-24);
    expect(quantumIndex(-0.5)).toBe(-12);
  });

  it('throws RangeError for non-finite beatFloat', () => {
    expect(() => quantumIndex(NaN)).toThrow(RangeError);
    expect(() => quantumIndex(Infinity)).toThrow(RangeError);
    expect(() => quantumIndex(-Infinity)).toThrow(RangeError);
  });
});