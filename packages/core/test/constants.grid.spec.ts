import { describe, it, expect } from 'vitest';
import { GRID_CONSTANTS } from '../src/constants/grid';

describe('Grid Constants', () => {
  it('should have all 22 values correctly defined', () => {
    expect(GRID_CONSTANTS.PERIOD_MIN).toBe(0.95);
    expect(GRID_CONSTANTS.PERIOD_MAX).toBe(1.05);
    expect(GRID_CONSTANTS.DRIFT_MAX_QUANTA).toBe(2.4);
    expect(GRID_CONSTANTS.ANCHOR_SYNC_BARS).toBe(16);
    expect(GRID_CONSTANTS.BODY_REALIGN_DBFS).toBe(-40);
    expect(GRID_CONSTANTS.FALLBACK_TRANSIENT_DBFS).toBe(-12);
    expect(GRID_CONSTANTS.CORR_MIN).toBe(0.85);
    expect(GRID_CONSTANTS.SHAPE_VAR_MAX).toBe(0.15);
    expect(GRID_CONSTANTS.STRAIGHT_VAR).toBe(0.02);
    expect(GRID_CONSTANTS.TRIPLET_VAR).toBe(0.05);
    expect(GRID_CONSTANTS.SWING_MIN).toBe(0.05);
    expect(GRID_CONSTANTS.SWING_MAX).toBe(0.33);
    expect(GRID_CONSTANTS.IRREGULAR_XFADE_EXTRA_QUANTA).toBe(0.48);
    expect(GRID_CONSTANTS.STATIC_GRID_BPM).toBe(120);
    expect(GRID_CONSTANTS.SAFETY_XFADE_BARS).toBe(4);
    expect(GRID_CONSTANTS.QUANTUM_DIVISOR).toBe(24);
    expect(GRID_CONSTANTS.GLIDE_MAX).toBe(0.08);
    expect(GRID_CONSTANTS.PITCH_NODE_SEMITONES).toBe(1);
    expect(GRID_CONSTANTS.REALIGN_MAX_SEMITONES).toBe(0.05);
    expect(GRID_CONSTANTS.RATE_MIN).toBe(0.98);
    expect(GRID_CONSTANTS.RATE_MAX).toBe(1.02);
    expect(GRID_CONSTANTS.RATE_SLEW_PER_QUANTA).toBeCloseTo(0.005 / 48, 12);
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(GRID_CONSTANTS)).toBe(true);
  });
});
