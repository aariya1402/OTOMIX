import { describe, it, expect } from 'vitest';
import { computeMixability } from '../src/features/mixability';

describe('computeMixability (preference skeleton)', () => {
  it('T1: all-zero features → score 0', () => {
    expect(computeMixability({}).score).toBe(0);
  });

  it('T2: all-max features → score 1', () => {
    const r = computeMixability({
      kick_grid_lock: 1,
      drift_absence: 1,
      kick_clarity: 1,
      grid_type_clarity: 1,
      transition_window_present: 1,
      vocal_absence: 1,
    });
    expect(r.score).toBeCloseTo(1, 9);
  });

  it('T3: perfect features score higher than poor features', () => {
    const perfect = computeMixability({
      kick_grid_lock: 1, drift_absence: 1, kick_clarity: 1,
      grid_type_clarity: 1, transition_window_present: 1, vocal_absence: 1,
    });
    const poor = computeMixability({
      kick_grid_lock: 0.1, drift_absence: 0.1, kick_clarity: 0.1,
      grid_type_clarity: 0.1, transition_window_present: 0.1, vocal_absence: 0.1,
    });
    expect(perfect.score).toBeGreaterThan(poor.score);
  });

  it('T4: only kick_grid_lock at max → score ≈ 0.25', () => {
    expect(computeMixability({ kick_grid_lock: 1 }).score).toBeCloseTo(0.25, 9);
  });

  it('T5: over-max, NaN, negative inputs are clamped', () => {
    const r = computeMixability({
      kick_grid_lock: 100,
      drift_absence: NaN,
      kick_clarity: -1,
      grid_type_clarity: Number.POSITIVE_INFINITY,
      transition_window_present: 0.5,
      vocal_absence: 100,
    });
    expect(r.score).toBeCloseTo(0.40, 9);
  });

  it('T6: never throws (Rule 25)', () => {
    expect(() => computeMixability({})).not.toThrow();
    expect(() => computeMixability({ kick_grid_lock: NaN })).not.toThrow();
    expect(() => computeMixability({ kick_grid_lock: -1 })).not.toThrow();
  });
});