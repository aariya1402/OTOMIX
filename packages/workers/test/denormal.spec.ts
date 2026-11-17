import { describe, it, expect } from 'vitest';
import { flushDenormal, flushDenormalArray, FLUSH_THRESHOLD } from '../src/denormal';

describe('denormal flush (P04-T03-S01-M05)', () => {
  it('decaying filter state from 1e-30 for 10000 samples becomes exactly 0, no subnormal', () => {
    let state = 1e-30;
    const DECAY = 0.9;

    for (let i = 0; i < 10_000; i++) {
      state = flushDenormal(state * DECAY);
      // No subnormal value may remain in state.
      if (Math.abs(state) < 1e-37) {
        expect(state).toBe(0);
      }
    }

    // By the time 10_000 samples have decayed, state must be exactly 0.
    expect(state).toBe(0);
  });

  it('flush threshold is applied to arrays', () => {
    const buf = new Float32Array([1e-30, 1e-40, 0.5, -1e-40, 0]);
    flushDenormalArray(buf);
    expect(buf[0]).toBeCloseTo(1e-30, 30); // above threshold: unchanged
    expect(buf[1]).toBe(0);                // below threshold: flushed
    expect(buf[2]).toBe(0.5);
    expect(buf[3]).toBe(0);
    expect(buf[4]).toBe(0);
  });

  it('flush constant is exported and positive', () => {
    expect(FLUSH_THRESHOLD).toBeGreaterThan(0);
    expect(FLUSH_THRESHOLD).toBe(1e-37);
  });
});