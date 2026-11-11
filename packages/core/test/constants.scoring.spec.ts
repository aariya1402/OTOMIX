import { describe, it, expect } from 'vitest';
import { SCORING_CONSTANTS } from '../src/constants/scoring';
import { ACCESS_CONSTANTS } from '../../access/src/constants';

describe('Scoring Constants', () => {
  it('should have all 7 core scoring values correctly defined', () => {
    expect(SCORING_CONSTANTS.ENERGY_WEIGHTS).toEqual([0.4, 0.3, 0.2, 0.1]);
    expect(SCORING_CONSTANTS.MIX_WEIGHTS).toEqual([0.4, 0.3, 0.2, 0.1]);
    expect(SCORING_CONSTANTS.UNMIXABLE_BELOW).toBe(0.4);
    expect(SCORING_CONSTANTS.VOCAL_THRESHOLD).toBe(0.65);
    expect(SCORING_CONSTANTS.VOCAL_MEDIAN_BEATS).toBe(2);
    expect(SCORING_CONSTANTS.RECO_WEIGHTS).toEqual([0.6, 0.3, 0.1]);
    expect(SCORING_CONSTANTS.TEMPO_DELTA_LIMIT).toBe(0.01);
  });

  it('should have all 9 access values correctly defined', () => {
    expect(ACCESS_CONSTANTS.WASM_HEAP_MB).toBe(512);
    expect(ACCESS_CONSTANTS.ACCESS_TTL_MIN).toBe(15);
    expect(ACCESS_CONSTANTS.REFRESH_TTL_DAYS).toBe(7);
    expect(ACCESS_CONSTANTS.KEY_ROTATION_DAYS).toBe(90);
    expect(ACCESS_CONSTANTS.IDEMPOTENCY_TTL_H).toBe(24);
    expect(ACCESS_CONSTANTS.MAX_RETRIES).toBe(3);
    expect(ACCESS_CONSTANTS.RPO_MIN).toBe(15);
    expect(ACCESS_CONSTANTS.RTO_MIN).toBe(60);
    expect(ACCESS_CONSTANTS.SLO).toBe(0.999);
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(SCORING_CONSTANTS)).toBe(true);
    expect(Object.isFrozen(ACCESS_CONSTANTS)).toBe(true);
  });
});
