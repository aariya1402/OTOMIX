import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  clampTempoDeltaPercent,
  combineScores,
  tempoWithinLimit,
} from '../src/mixplan/score';

describe('P08 recommendation decision', () => {
  it('uses 60/30/10 mixability/camelot/tempo weights', () => {
    expect(DEFAULT_WEIGHTS).toEqual({
      mixability: 0.60,
      camelot: 0.30,
      tempo: 0.10,
      energy: 0,
    });
    expect(combineScores({ mixability: 1, camelot: 0, tempo: 0, energy: 0 })).toBe(0.60);
  });

  it('clamps configurable tempo limit to 2-20 percent and applies a hard filter', () => {
    expect(clampTempoDeltaPercent(1)).toBe(2);
    expect(clampTempoDeltaPercent(25)).toBe(20);
    expect(tempoWithinLimit(120, 130, 10)).toBe(true);
    expect(tempoWithinLimit(120, 133, 10)).toBe(false);
  });
});
