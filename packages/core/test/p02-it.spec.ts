// OTOMIX §3.1; §3.3; §3.10; §3.15 · Mother §2.1; §2.3; §2.10
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridModel } from '../src/grid/model';
import { tOfI } from '../src/grid/t-of-i';
import { boundPeriod } from '../src/grid/period';
import { getSyncedDrift, ANCHOR_SYNC_INTERVAL_BEATS } from '../src/grid/anchor-sync';
import { LookaheadScheduler } from '../src/timing/scheduler';
import { beatInBar, barIndex, blockPosition, isBlockBoundary, floorMod } from '../src/timing/structure';
import { getPreKickBeat } from '../src/grid/prekick-short';
import { getPreKickTime, PreKickSegment } from '../src/grid/prekick-map';
import { DRIFT_MAX_QUANTA, QUANTUM_DIVISOR } from '../src/constants/grid';

class TestClock {
  now(): number { return Date.now() / 1000; }
}

describe('P02-IT: Phase 2 Integration Test Suite', () => {
  it('t(i) is strictly increasing for i=1..256 (64 bars)', () => {
    const model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0 }]);
    let prev = model.t(1);
    for (let i = 2; i <= 256; i++) {
      const curr = model.t(i);
      expect(curr).toBeGreaterThan(prev);
      prev = curr;
    }
  });

  describe('Lock-failure recovery (forced)', () => {
    let model: GridModel;

    beforeEach(() => {
      model = new GridModel([{ startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0.04 }]);
    });

    it('transitions to RECOVERY state', () => {
      model.enterRecovery(110, 0.30);
      expect(model.getState()).toBe('RECOVERY');
    });

    it('uses global average BPM at beat 1 (T0 exactly, delta=0)', () => {
      model.enterRecovery(110, 0.30);
      expect(model.t(1)).toBeCloseTo(0.30, 9);
    });

    it('uses global average BPM at beat 17', () => {
      model.enterRecovery(110, 0.30);
      expect(model.t(17)).toBeCloseTo(0.30 + 16 * (60 / 110), 9);
    });

    it('uses global average BPM at beat 65', () => {
      model.enterRecovery(110, 0.30);
      expect(model.t(65)).toBeCloseTo(0.30 + 64 * (60 / 110), 9);
    });

    it('forces delta to 0 in RECOVERY', () => {
      model.enterRecovery(110, 0.30);
      expect(model.t(1)).toBeCloseTo(0.30, 9);
      expect(model.t(33)).toBeCloseTo(0.30 + 32 * (60 / 110), 9);
    });

    it('is idempotent (second call ignored)', () => {
      model.enterRecovery(110, 0.30);
      model.enterRecovery(130, 0.40);
      expect(model.getState()).toBe('RECOVERY');
      expect(model.t(1)).toBeCloseTo(0.30, 9);
    });

    it('discards old segments on recovery (no exit)', () => {
      const piecewise = new GridModel([
        { startBeat: 1, bpmSeed: 120, T0: 0.25, delta: 0 },
        { startBeat: 33, bpmSeed: 124, T0: 16.0, delta: 0 },
      ]);
      piecewise.enterRecovery(118, 0.25);
      expect(piecewise.t(33)).toBeCloseTo(0.25 + 32 * (60 / 118), 9);
    });
  });

  it('boundPeriod clamps to [0.95, 1.05] x seedPeriod', () => {
    const seed = 0.5;
    expect(boundPeriod(0.52, seed)).toBeCloseTo(0.52, 9);
    expect(boundPeriod(0.40, seed)).toBeCloseTo(0.475, 9);
    expect(boundPeriod(0.60, seed)).toBeCloseTo(0.525, 9);
  });

  it('Delta resets at beats 64, 128, 192', () => {
    const driftPerBeat = 0.0005;
    // At sync points, delta is the accumulated drift since last anchor
    // Beat 64: 63 intervals from beat 1 -> 63 * driftPerBeat
    // Beat 128: 64 intervals from beat 64 -> 64 * driftPerBeat
    // Beat 192: 64 intervals from beat 128 -> 64 * driftPerBeat
    expect(getSyncedDrift(64, driftPerBeat, 120)).toBeCloseTo(63 * driftPerBeat / ((60 / 120) / QUANTUM_DIVISOR), 9);
    expect(getSyncedDrift(128, driftPerBeat, 120)).toBeCloseTo(64 * driftPerBeat / ((60 / 120) / QUANTUM_DIVISOR), 9);
    expect(getSyncedDrift(192, driftPerBeat, 120)).toBeCloseTo(64 * driftPerBeat / ((60 / 120) / QUANTUM_DIVISOR), 9);
    // All within (DRIFT_MAX_QUANTA * (60 / 120) / QUANTUM_DIVISOR)
    for (const beat of [64, 128, 192]) {
      expect(Math.abs(getSyncedDrift(beat, driftPerBeat, 120))).toBeLessThanOrEqual(DRIFT_MAX_QUANTA);
    }
  });

  it('structural helpers match 3.15 table', () => {
    expect(beatInBar(-1)).toBe(3);
    expect(beatInBar(1)).toBe(1);
    expect(beatInBar(5)).toBe(1);
    expect(beatInBar(17)).toBe(1);
    expect(barIndex(1)).toBe(0);
    expect(barIndex(65)).toBe(16);
    expect(blockPosition(1, 16)).toBe(0);
    expect(blockPosition(65, 16)).toBe(0);
    expect(isBlockBoundary(1, 16)).toBe(true);
    expect(isBlockBoundary(65, 16)).toBe(true);
    expect(isBlockBoundary(64, 16)).toBe(false);
    expect(floorMod(-1, 4)).toBe(3);
    expect(floorMod(5, 4)).toBe(1);
  });

  it('LookaheadScheduler schedules and cancels events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const clock = new TestClock();
      const scheduler = new LookaheadScheduler(clock, 16);
      const executed: number[] = [];

      scheduler.schedule(1, clock.now() + 0.01, () => executed.push(1));
      scheduler.schedule(2, clock.now() + 0.02, () => executed.push(2));

      vi.advanceTimersByTime(50);
      expect(executed).toContain(1);
      expect(executed).toContain(2);

      // Cancel test: schedule FAR in future so event stays in heap
      const scheduler2 = new LookaheadScheduler(clock, 16);
      const cancelled: number[] = [];
      const id = scheduler2.schedule(1, clock.now() + 1.0, () => cancelled.push(1));
      scheduler2.cancel(id);
      vi.advanceTimersByTime(50);
      expect(cancelled).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('Pre-kick mapping (negative indices, skip-zero)', () => {
    it('getPreKickBeat maps timestamps to negative beat indices', () => {
      const T0 = 1.2;
      const bpmSeed = 120;
      expect(getPreKickBeat(0.7, T0, bpmSeed)).toBe(-1);
      expect(getPreKickBeat(0.2, T0, bpmSeed)).toBe(-2);
    });

    it('getPreKickTime computes timestamps for negative indices', () => {
      const segments: PreKickSegment[] = [{ startBeat: -3, bpmSeed: 120 }];
      const T0 = 0;
      expect(getPreKickTime(-3, segments, T0)).toBeCloseTo(-1.5, 9);
      expect(getPreKickTime(-1, segments, T0)).toBeCloseTo(-0.5, 9);
    });

    it('rejects beat index 0', () => {
      const segments: PreKickSegment[] = [{ startBeat: -3, bpmSeed: 120 }];
      expect(() => getPreKickTime(0, segments, 0)).toThrow('Beat index 0 is not assigned');
    });
  });
});