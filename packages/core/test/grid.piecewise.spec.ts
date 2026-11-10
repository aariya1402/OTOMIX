// OTOMIX §3.1 · Mother §2.1
import { describe, it, expect } from 'vitest';
import { GridModel, GridSegment } from '../src/grid/model';
import { tOfI } from '../src/grid/t-of-i';
import { isBlockBoundary } from '../src/timing/structure';

describe('GridModel (Piecewise)', () => {
  it('single segment (baseline)', () => {
    const model = new GridModel([
      { startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0 }
    ]);
    expect(model.t(1)).toBeCloseTo(0.25, 9);
    expect(model.t(17)).toBeCloseTo(8.25, 9);
  });

  it('two segments, continuity at boundary', () => {
    const seg1 = { startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0 };
    const t32 = tOfI(32, seg1.T0, seg1.bpmSeed, seg1.delta); // 15.75
    
    const seg2Period = 60 / 124;
    // We want t(33) to be t(32) + 60/120 (per spec).
    // t(33) = T0_2 + 32 * seg2Period  => T0_2 = t(32) + 60/120 - 32 * seg2Period
    const seg2 = { 
      startBeat: 33, 
      bpmSeed: 124, 
      T0: t32 + (60/120) - 32 * seg2Period, 
      delta: 0 
    };
    
    const model = new GridModel([seg1, seg2]);
    const t33 = model.t(33);
    
    expect(t33).toBeCloseTo(t32 + 60/120, 9);
  });

  it('strictly increasing across boundary', () => {
    const seg1 = { startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0 };
    const t32 = tOfI(32, seg1.T0, seg1.bpmSeed, seg1.delta);
    const seg2Period = 60 / 124;
    const seg2 = { 
      startBeat: 33, 
      bpmSeed: 124, 
      T0: t32 + (60/120) - 32 * seg2Period, 
      delta: 0 
    };
    const model = new GridModel([seg1, seg2]);
    expect(model.t(33)).toBeGreaterThan(model.t(32));
  });

  it('boundary on structural block', () => {
    // 33 is the start of the 9th bar. If nBars=8, then beat 33 is a block boundary.
    expect(isBlockBoundary(33, 8)).toBe(true);
  });
});