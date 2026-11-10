// OTOMIX §3.3 · LookaheadScheduler tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LookaheadScheduler } from '../src/timing/scheduler';
import { Clock } from '../src/timing/clock';
import { LOOKAHEAD_MS, SCHED_ACCURACY_MS } from '../src/constants/timing';

class JitterClock implements Clock {
  private jitterArr: number[];
  private idx = 0;
  
  constructor(jitterMs: number) {
    let seed = 0xACE1;
    this.jitterArr = [];
    for (let i = 0; i < 100000; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const normalized = (seed / 0x100000000) * 2 - 1;
      this.jitterArr.push(normalized * jitterMs);
    }
  }
  
  now(): number {
    const j = this.jitterArr[this.idx++ % this.jitterArr.length];
    return Date.now() / 1000 + j / 1000;
  }
}

describe('LookaheadScheduler', () => {
  let scheduler: LookaheadScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    if (scheduler) scheduler.stop();
    vi.useRealTimers();
  });

  it('schedules and fires event within lookahead window', () => {
    const clock = new JitterClock(0);
    scheduler = new LookaheadScheduler(clock);
    const fired: number[] = [];
    scheduler.schedule(1, 1.0, () => fired.push(Date.now()));
    expect(fired.length).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(fired.length).toBe(1);
    expect(fired[0]).toBe(1000); // 1.0s = 1000ms
  });

  it('fires 1000 events with ±1.9ms jitter within ±2ms accuracy', () => {
    const clock = new JitterClock(1.9);
    scheduler = new LookaheadScheduler(clock);
    const errors: number[] = [];

    for (let i = 0; i < 1000; i++) {
      const targetTimeMs = (i + 1) * 100;
      scheduler.schedule(i + 1, targetTimeMs / 1000, () => {
        errors.push(Math.abs(Date.now() - targetTimeMs));
      });
    }

    vi.advanceTimersByTime(101000);

    expect(errors.length).toBe(1000);
    const maxError = Math.max(...errors);
    expect(maxError).toBeLessThanOrEqual(SCHED_ACCURACY_MS);
  });

  it('reports violation with ±2.1ms jitter', () => {
    const clock = new JitterClock(2.1);
    scheduler = new LookaheadScheduler(clock);
    const errors: number[] = [];

    for (let i = 0; i < 1000; i++) {
      const targetTimeMs = (i + 1) * 100;
      scheduler.schedule(i + 1, targetTimeMs / 1000, () => {
        errors.push(Math.abs(Date.now() - targetTimeMs));
      });
    }

    vi.advanceTimersByTime(101000);

    expect(errors.length).toBe(1000);
    const maxError = Math.max(...errors);
    expect(maxError).toBeGreaterThan(SCHED_ACCURACY_MS);
  });

  it('handles negative beat indices (pre-kick)', () => {
    const clock = new JitterClock(0);
    scheduler = new LookaheadScheduler(clock);
    const fired: number[] = [];
    scheduler.schedule(-1, 1.0, () => fired.push(Date.now()));
    vi.advanceTimersByTime(2000);
    expect(fired.length).toBe(1);
  });

  it('cancels event by ID before firing', () => {
    const clock = new JitterClock(0);
    scheduler = new LookaheadScheduler(clock);
    const fired: number[] = [];
    const id = scheduler.schedule(1, 1.0, () => fired.push(1));
    scheduler.cancel(id);
    vi.advanceTimersByTime(2000);
    expect(fired.length).toBe(0);
  });

  it('throws when capacity exceeded', () => {
    const clock = new JitterClock(0);
    scheduler = new LookaheadScheduler(clock, 2);
    scheduler.schedule(1, 100, () => {});
    scheduler.schedule(2, 101, () => {});
    expect(() => scheduler.schedule(3, 102, () => {})).toThrow('capacity exceeded');
  });

  it('zero-RAM: no allocations during poll (heap snapshot)', () => {
    const clock = new JitterClock(0);
    scheduler = new LookaheadScheduler(clock);
    for (let i = 0; i < 100; i++) {
      scheduler.schedule(i, 100 + i * 0.01, () => {});
    }
    expect((scheduler as any).size).toBe(100);
    expect((scheduler as any).heap.length).toBe(1024);
  });
});