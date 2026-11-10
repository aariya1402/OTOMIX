// OTOMIX §3.1 · Mother §2.1
import { describe, it, expect } from 'vitest';
import { GridModel } from '../src/grid/model';

describe('GridModel Lock-Failure Recovery', () => {
  it('initial state is LOCKED', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.01 }]);
    expect(model.getState()).toBe('LOCKED');
  });

  it('transitions to RECOVERY', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.01 }]);
    model.enterRecovery(118, 0.25);
    expect(model.getState()).toBe('RECOVERY');
  });

  it('uses global average BPM at beat 1', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.01 }]);
    model.enterRecovery(118, 0.25);
    expect(model.t(1)).toBeCloseTo(0.25, 9);
  });

  it('uses global average BPM at beat 17', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.01 }]);
    model.enterRecovery(118, 0.25);
    expect(model.t(17)).toBeCloseTo(0.25 + 16 * (60/118), 9);
  });

  it('forces delta to 0 in RECOVERY', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.05 }]);
    model.enterRecovery(118, 0.25);
    // t(1) should equal T0 exactly (no delta)
    expect(model.t(1)).toBeCloseTo(0.25, 9);
    expect(model.t(33)).toBeCloseTo(0.25 + 32 * (60/118), 9);
  });

  it('is idempotent', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.01 }]);
    model.enterRecovery(118, 0.25);
    model.enterRecovery(130, 0.3); // should be ignored
    expect(model.getState()).toBe('RECOVERY');
    expect(model.t(1)).toBeCloseTo(0.25, 9); // Still using first recovery params
  });

  it('discards old segments on recovery (no exit)', () => {
    const model = new GridModel([
      { startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0 },
      { startBeat: 33, bpmSeed: 124, T0: 16.0, delta: 0 }
    ]);
    model.enterRecovery(118, 0.25);
    // t(33) should now use global average BPM, not segment 2
    expect(model.t(33)).toBeCloseTo(0.25 + 32 * (60/118), 9);
  });

  it('handles drifting fixture on recovery', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.04 }]);
    model.enterRecovery(110, 0.30);
    // All beats use bpm=110, T0=0.30, delta=0
    expect(model.t(1)).toBeCloseTo(0.30, 9);
    expect(model.t(17)).toBeCloseTo(0.30 + 16 * (60/110), 9);
    expect(model.t(65)).toBeCloseTo(0.30 + 64 * (60/110), 9);
  });
});