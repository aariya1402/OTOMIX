import { describe, expect, it } from 'vitest';
import { hasStarterTrackWarning } from '../src/state/starter-warning';

describe('hasStarterTrackWarning (P08-T03-S01-M01)', () => {
  const starter = { camelotKey: '8A', bpm: 100 };

  it('warns when the tempo delta relative to the neighbor is below 1%', () => {
    expect(
      hasStarterTrackWarning(starter, [{ camelotKey: '8A', bpm: 101.006 }])
    ).toBe(true);
    expect(
      hasStarterTrackWarning(starter, [{ camelotKey: '8A', bpm: 101.009 }])
    ).toBe(true);
    expect(
      hasStarterTrackWarning(starter, [{ camelotKey: '8A', bpm: 99.5 }])
    ).toBe(true);
  });

  it('does not warn at or above the strict 1% boundary', () => {
    expect(
      hasStarterTrackWarning(
        { camelotKey: '8A', bpm: 101 },
        [{ camelotKey: '8A', bpm: 100 }]
      )
    ).toBe(false);
    expect(
      hasStarterTrackWarning(
        { camelotKey: '8A', bpm: 99 },
        [{ camelotKey: '8A', bpm: 100 }]
      )
    ).toBe(false);
  });

  it('requires the same valid key and at least one adjacent track', () => {
    expect(hasStarterTrackWarning(starter, [{ camelotKey: '8B', bpm: 100.5 }])).toBe(false);
    expect(hasStarterTrackWarning(starter, [])).toBe(false);
    expect(hasStarterTrackWarning(null, [{ camelotKey: '8A', bpm: 100.5 }])).toBe(false);
    expect(
      hasStarterTrackWarning(
        { camelotKey: 'not-a-key', bpm: 100 },
        [{ camelotKey: 'not-a-key', bpm: 100.5 }]
      )
    ).toBe(false);
  });

  it('returns false for zero or non-finite starter and neighbor tempos', () => {
    for (const bpm of [0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(hasStarterTrackWarning({ camelotKey: '8A', bpm }, [{ camelotKey: '8A', bpm: 100.5 }]))
        .toBe(false);
      expect(hasStarterTrackWarning(starter, [{ camelotKey: '8A', bpm }])).toBe(false);
    }
  });

  it('ignores tracks with invalid Camelot keys', () => {
    expect(
      hasStarterTrackWarning(starter, [{ camelotKey: 'not-a-key', bpm: 100.5 }])
    ).toBe(false);
  });
});
