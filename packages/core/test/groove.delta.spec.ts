// OTOMIX §3.5 · Mother §2.5
import { describe, it, expect } from 'vitest';
import { swingDeltaQuanta } from '../src/groove/delta';
import { QUANTUM_DIVISOR, SWING_MIN, SWING_MAX } from '../src/constants/grid';

describe('swingDeltaQuanta (P03-T05-S01-M02)', () => {
  it('converts 0.15 beat displacement to 3.6 quanta', () => {
    expect(swingDeltaQuanta(0.15)).toBeCloseTo(0.15 * QUANTUM_DIVISOR, 9);
  });

  it('handles minimum swing displacement (0.05 beats) -> 1.2 quanta', () => {
    expect(swingDeltaQuanta(0.05)).toBeCloseTo(0.05 * QUANTUM_DIVISOR, 9);
  });

  it('handles maximum swing displacement (0.33 beats) -> 7.92 quanta', () => {
    expect(swingDeltaQuanta(0.33)).toBeCloseTo(0.33 * QUANTUM_DIVISOR, 9);
  });

  it('throws on displacement below SWING_MIN', () => {
    expect(() => swingDeltaQuanta(SWING_MIN - 0.01)).toThrow(RangeError);
  });

  it('throws on displacement above SWING_MAX', () => {
    expect(() => swingDeltaQuanta(SWING_MAX + 0.01)).toThrow(RangeError);
  });

  it('throws on non-finite displacement', () => {
    expect(() => swingDeltaQuanta(NaN)).toThrow(RangeError);
    expect(() => swingDeltaQuanta(Infinity)).toThrow(RangeError);
  });
});