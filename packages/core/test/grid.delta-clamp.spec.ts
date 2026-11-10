// OTOMIX §3.1 · Mother §2.1
import { describe, it, expect, beforeEach } from 'vitest';
import { tOfI, getDeltaClampedCount, resetDeltaClampedCount } from '../src/grid/t-of-i';
import { BeatIndex } from '../src/types/beat-index';
import { BPM } from '../src/types/bpm';
import { DRIFT_MAX_S } from '../src/constants/grid';

describe('tOfI — Delta clamping (P02-T01-S01-M02)', () => {
  const bpmSeed = BPM.parse(120);
  const T0 = 0.25;
  const i = BeatIndex.parse(1);

  beforeEach(() => {
    resetDeltaClampedCount();
    if (!bpmSeed.ok || !i.ok) throw new Error('Test setup failed');
  });

  it('clamps positive delta > DRIFT_MAX_S and increments counter', () => {
    const result = tOfI(i.value, T0, bpmSeed.value, 0.06);
    expect(result).toBeCloseTo(T0 + DRIFT_MAX_S, 9);
    expect(getDeltaClampedCount()).toBe(1);
  });

  it('clamps negative delta < -DRIFT_MAX_S and increments counter cumulatively', () => {
    // Input 1: delta = 0.06
    tOfI(i.value, T0, bpmSeed.value, 0.06);
    // Input 2: delta = -0.06
    const result = tOfI(i.value, T0, bpmSeed.value, -0.06);
    expect(result).toBeCloseTo(T0 - DRIFT_MAX_S, 9);
    // Input 3: delta = 0.05 (should not clamp)
    tOfI(i.value, T0, bpmSeed.value, 0.05);
    
    // Total counter should be 2
    expect(getDeltaClampedCount()).toBe(2);
  });

  it('does not clamp delta === 0', () => {
    const result = tOfI(i.value, T0, bpmSeed.value, 0);
    expect(result).toBeCloseTo(T0, 9);
    expect(getDeltaClampedCount()).toBe(0);
  });

  it('does not clamp delta === DRIFT_MAX_S', () => {
    const result = tOfI(i.value, T0, bpmSeed.value, DRIFT_MAX_S);
    expect(result).toBeCloseTo(T0 + DRIFT_MAX_S, 9);
    expect(getDeltaClampedCount()).toBe(0);
  });
});