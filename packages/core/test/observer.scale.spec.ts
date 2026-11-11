// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect } from 'vitest';
import { computeNextRate } from '../src/observer/scale';
import {
  QUANTUM_DIVISOR, RATE_MIN, RATE_MAX, RATE_SLEW_PER_QUANTA,
  OBSERVER_MAX_EXPECTED_DRIFT_QUANTA,
} from '../src/constants/grid';
import { DRIFT_THRESHOLD_QUANTA } from '../src/constants/timing';

const BPM = 120;

describe('computeNextRate (P03-T04-S01-M03)', () => {
  it('no change when drift is below threshold', () => {
    const subThresholdQuanta = DRIFT_THRESHOLD_QUANTA * 0.9;
    const rate = computeNextRate(1.0, subThresholdQuanta, 0.1, BPM);
    expect(rate).toBe(1.0);
  });

  it('sustained drift above threshold changes rate', () => {
    const largeDrift = OBSERVER_MAX_EXPECTED_DRIFT_QUANTA;
    const rate = computeNextRate(1.0, largeDrift, 0.1, BPM);
    expect(rate).toBeLessThan(1.0);
  });

  it('rate stays within [RATE_MIN, RATE_MAX] after many iterations', () => {
    let rate = 1.0;
    for (let i = 0; i < 1000; i++) {
      rate = computeNextRate(rate, 1000, 0.1, BPM);
    }
    expect(rate).toBeGreaterThanOrEqual(RATE_MIN);
    expect(rate).toBeLessThanOrEqual(RATE_MAX);
  });

  it('slew limits per-step rate change', () => {
    const dt = 0.01;
    const rate1 = computeNextRate(1.0, 100, dt, BPM);
    const dtQuanta = dt * QUANTUM_DIVISOR * BPM / 60;
    const maxSlew = RATE_SLEW_PER_QUANTA * dtQuanta;
    expect(Math.abs(rate1 - 1.0)).toBeLessThanOrEqual(maxSlew + 1e-9);
  });

  it('negative drift increases rate above 1.0', () => {
    const rate = computeNextRate(1.0, -100, 0.1, BPM);
    expect(rate).toBeGreaterThan(1.0);
  });
});