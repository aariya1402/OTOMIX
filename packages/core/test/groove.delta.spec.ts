// OTOMIX §3.5 · Mother §2.5
import { describe, it, expect } from 'vitest';
import { swingDeltaSeconds } from '../src/groove/delta';

describe('swingDeltaSeconds (P03-T05-S01-M02)', () => {
  it('converts 0.15 beat displacement at 120 BPM to 0.075 s', () => {
    expect(swingDeltaSeconds(0.15, 120)).toBeCloseTo(0.075, 9);
  });

  it('handles minimum swing displacement (0.05 beats) at 120 BPM', () => {
    expect(swingDeltaSeconds(0.05, 120)).toBeCloseTo(0.025, 9);
  });

  it('handles maximum swing displacement (0.33 beats) at 120 BPM', () => {
    expect(swingDeltaSeconds(0.33, 120)).toBeCloseTo(0.165, 9);
  });

  it('scales correctly with BPM (60 and 180)', () => {
    expect(swingDeltaSeconds(0.15, 60)).toBeCloseTo(0.15, 9);
    expect(swingDeltaSeconds(0.15, 180)).toBeCloseTo(0.05, 9);
  });

  it('throws on non-positive BPM or out-of-range displacement', () => {
    expect(() => swingDeltaSeconds(0.15, 0)).toThrow(RangeError);
    expect(() => swingDeltaSeconds(0.15, -120)).toThrow(RangeError);
    expect(() => swingDeltaSeconds(0.04, 120)).toThrow(RangeError);
    expect(() => swingDeltaSeconds(0.34, 120)).toThrow(RangeError);
  });
});