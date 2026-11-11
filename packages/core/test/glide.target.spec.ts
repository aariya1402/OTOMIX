// OTOMIX §3.7 · Mother §2.7
// P04-T01-S01-M01: Glide target unit tests
import { describe, it, expect } from 'vitest';
import { computeGlideTarget } from '../src/glide/target';

describe('computeGlideTarget (P04-T01-S01-M01)', () => {
  it('returns exact average for (120, 128) -> 124', () => {
    expect(computeGlideTarget(120, 128)).toBe(124);
  });

  it('returns exact average for (90, 90) -> 90', () => {
    expect(computeGlideTarget(90, 90)).toBe(90);
  });

  it('throws TypeError for NaN', () => {
    expect(() => computeGlideTarget(NaN, 120)).toThrow(TypeError);
    expect(() => computeGlideTarget(120, NaN)).toThrow(TypeError);
  });

  it('throws TypeError for Infinity', () => {
    expect(() => computeGlideTarget(Infinity, 120)).toThrow(TypeError);
    expect(() => computeGlideTarget(120, -Infinity)).toThrow(TypeError);
  });

  it('throws RangeError for zero or negative', () => {
    expect(() => computeGlideTarget(0, 120)).toThrow(RangeError);
    expect(() => computeGlideTarget(120, -10)).toThrow(RangeError);
  });

  it('returns precise float for non-integer average (120, 127) -> 123.5', () => {
    expect(computeGlideTarget(120, 127)).toBe(123.5);
  });
});