import { describe, it, expect } from 'vitest';
import { fadeGain, fadeGainDefault } from '../src/chop/fade';
import { CHOP_CROSSFADE_BEATS } from '../src/constants/grid';

describe('fadeGain (P04-T02-S02-M01)', () => {
  it('returns 1.0 at t=0, 0.5 at midpoint, 0.0 at end (crossfadeBeats=8)', () => {
    const cb = 8;
    expect(Math.abs(fadeGain(0, cb) - 1.0)).toBeLessThan(1e-12);
    expect(Math.abs(fadeGain(4, cb) - 0.5)).toBeLessThan(1e-12);
    expect(Math.abs(fadeGain(8, cb) - 0.0)).toBeLessThan(1e-12);
  });

  it('clamps t < 0 to t=0 (gain 1.0)', () => {
    expect(Math.abs(fadeGain(-3, 8) - 1.0)).toBeLessThan(1e-12);
  });

  it('clamps t > crossfadeBeats to t=crossfadeBeats (gain 0.0)', () => {
    expect(Math.abs(fadeGain(12, 8) - 0.0)).toBeLessThan(1e-12);
  });

  it('is monotonically non-increasing over [0, crossfadeBeats]', () => {
    const cb = 8;
    let prev = fadeGain(0, cb);
    for (let i = 1; i <= 32; i++) {
      const t = (i / 32) * cb;
      const v = fadeGain(t, cb);
      expect(v).toBeLessThanOrEqual(prev + 1e-15);
      prev = v;
    }
  });

  it('matches formula 0.5*(1+cos(pi*t/cb)) within 1e-12', () => {
    const cb = 8;
    for (const t of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      const expected = 0.5 * (1 + Math.cos((Math.PI * t) / cb));
      expect(Math.abs(fadeGain(t, cb) - expected)).toBeLessThan(1e-12);
    }
  });

  it('throws RangeError for crossfadeBeats <= 0', () => {
    expect(() => fadeGain(1, 0)).toThrow(RangeError);
    expect(() => fadeGain(1, -4)).toThrow(RangeError);
  });
});

describe('fadeGainDefault', () => {
  it('uses CHOP_CROSSFADE_BEATS as default length', () => {
    expect(Math.abs(fadeGainDefault(0) - 1.0)).toBeLessThan(1e-12);
    expect(Math.abs(fadeGainDefault(CHOP_CROSSFADE_BEATS) - 0.0)).toBeLessThan(1e-12);
  });
});