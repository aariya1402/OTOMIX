import { describe, expect, it } from 'vitest';
import { gateTransitionWindow } from '../src/mixplan/vocal-gate';

describe('mixplan vocal gate', () => {
  it('moves an overlapping window to the nearest instrumental window', () => {
    expect(
      gateTransitionWindow(
        { startBeat: 2, endBeat: 4 },
        [0, 0, 1, 1, 0, 0, 0]
      )
    ).toEqual({ startBeat: 0, endBeat: 2 });
  });

  it('chooses the candidate with the nearest center', () => {
    expect(
      gateTransitionWindow(
        { startBeat: 3, endBeat: 5 },
        [0, 0, 1, 1, 1, 0, 0]
      )
    ).toEqual({ startBeat: 5, endBeat: 7 });
  });

  it('preserves a window that does not overlap vocal beats', () => {
    const window = { startBeat: 0, endBeat: 2 };
    expect(gateTransitionWindow(window, [0, 0, 1])).toBe(window);
  });

  it('uses half-open boundaries and permits a window at the map end', () => {
    expect(
      gateTransitionWindow({ startBeat: 1, endBeat: 2 }, [0, 0, 1])
    ).toEqual({ startBeat: 1, endBeat: 2 });
    expect(
      gateTransitionWindow({ startBeat: 0, endBeat: 1 }, [1, 0])
    ).toEqual({ startBeat: 1, endBeat: 2 });
  });

  it('fails closed when no instrumental window exists or the map is ambiguous', () => {
    expect(gateTransitionWindow({ startBeat: 0, endBeat: 1 }, [1, 1])).toBeNull();
    expect(gateTransitionWindow({ startBeat: 0, endBeat: 1 }, [1, 0.5])).toBeNull();
  });
});
