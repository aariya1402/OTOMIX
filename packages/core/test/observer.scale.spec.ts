// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect } from 'vitest';
import { computeNextRate } from '../src/observer/scale';
import { DRIFT_THRESHOLD_MS } from '../src/constants/timing';
import { RATE_MIN, RATE_MAX, RATE_SLEW_PER_S } from '../src/constants/grid';

describe('computeNextRate', () => {
  it('no change when drift is below threshold (3.9 ms)', () => {
    const rate = computeNextRate(1.0, 3.9, 0.1);
    expect(rate).toBe(1.0);
  });

  it('scaling begins when drift exceeds threshold (4.1 ms)', () => {
    const rate = computeNextRate(1.0, 4.1, 0.1);
    expect(rate).toBeLessThan(1.0);
    expect(rate).toBeGreaterThanOrEqual(RATE_MIN);
  });

  it('sustained 50 ms drift over 10 s respects slew and clamp', () => {
    let rate = 1.0;
    const dt = 0.1;
    const steps = 100;
    const driftMs = 50;

    for (let i = 0; i < steps; i++) {
      const prevRate = rate;
      rate = computeNextRate(rate, driftMs, dt);

      const maxSlew = RATE_SLEW_PER_S * dt;
      expect(Math.abs(rate - prevRate)).toBeLessThanOrEqual(maxSlew + 1e-12);

      expect(rate).toBeGreaterThanOrEqual(RATE_MIN);
      expect(rate).toBeLessThanOrEqual(RATE_MAX);
    }

    expect(rate).toBeCloseTo(RATE_MIN, 3);
  });
});