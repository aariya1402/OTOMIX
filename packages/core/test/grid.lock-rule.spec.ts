import { describe, it, expect } from 'vitest';
import { lockGridToKick, RUNTIME_REALIGNMENT_ALLOWED } from '../src/grid/lock-rule';

describe('lockGridToKick (D7: grid locks to kick)', () => {
  it('T1: kick exactly on grid → shiftBeats = 0', () => {
    const r = lockGridToKick({ bpmSeed: 120, T0: 0.50, kickTimes: [0.50] });
    expect(r.shiftBeats).toBeCloseTo(0, 9);
    expect(r.newT0).toBeCloseTo(0.50, 9);
    expect(r.withinTolerance).toBe(true);
  });

  it('T2: kick 0.35s late at 120 BPM → shiftBeats = +0.7', () => {
    const r = lockGridToKick({ bpmSeed: 120, T0: 0.50, kickTimes: [0.85] });
    expect(r.shiftBeats).toBeCloseTo(0.7, 9);
    expect(r.newT0).toBeCloseTo(0.85, 9);
    expect(r.withinTolerance).toBe(false); // 0.7 beats > 0.05 tolerance
  });

  it('T3: kick 0.25s early at 120 BPM → shiftBeats = -0.5', () => {
    const r = lockGridToKick({ bpmSeed: 120, T0: 0.50, kickTimes: [0.25] });
    expect(r.shiftBeats).toBeCloseTo(-0.5, 9);
    expect(r.newT0).toBeCloseTo(0.25, 9);
    expect(r.withinTolerance).toBe(false);
  });

  it('T4: drift within tolerance (0.02 beats) → withinTolerance = true', () => {
    // 0.02 beats × 0.5s = 0.01s. Kick at 0.51s vs T0 0.50s.
    const r = lockGridToKick({ bpmSeed: 120, T0: 0.50, kickTimes: [0.51] });
    expect(r.shiftBeats).toBeCloseTo(0.02, 9);
    expect(r.withinTolerance).toBe(true);
  });

  it('T5: no kicks → no shift, unchanged T0', () => {
    const r = lockGridToKick({ bpmSeed: 120, T0: 0.50, kickTimes: [] });
    expect(r.shiftBeats).toBe(0);
    expect(r.newT0).toBeCloseTo(0.50, 9);
    expect(r.withinTolerance).toBe(true);
  });

  it('T6: multiple kicks → uses the first kick as anchor', () => {
    const r = lockGridToKick({ bpmSeed: 120, T0: 0.50, kickTimes: [0.85, 1.30, 1.80] });
    expect(r.newT0).toBeCloseTo(0.85, 9);
  });

  it('T7: invalid bpmSeed (0 or NaN) → no-op', () => {
    const r1 = lockGridToKick({ bpmSeed: 0, T0: 0.50, kickTimes: [0.85] });
    expect(r1.shiftBeats).toBe(0);
    expect(r1.newT0).toBeCloseTo(0.50, 9);
    const r2 = lockGridToKick({ bpmSeed: NaN, T0: 0.50, kickTimes: [0.85] });
    expect(r2.shiftBeats).toBe(0);
  });

  it('T8: RUNTIME_REALIGNMENT_ALLOWED is false (D7 red line)', () => {
    expect(RUNTIME_REALIGNMENT_ALLOWED).toBe(false);
  });
});