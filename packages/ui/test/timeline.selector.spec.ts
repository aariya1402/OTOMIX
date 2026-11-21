import { describe, it, expect, vi } from 'vitest';
import { createTimelineSelector, computeTimeline } from '../src/state/timeline';

describe('P08-T01-S02-M02 timeline selector', () => {
  it('memoizes recomputation and only recomputes for queue mutations', () => {
    const getTrack = vi.fn((trackId: string) => ({
      trackId,
      t0Seconds: 0,
      bpm: 120,
      durationSeconds: 60,
    }));
    const selector = createTimelineSelector(getTrack);

    const first = selector(['a', 'b'], 1);
    expect(first).toEqual(computeTimeline([
      { trackId: 'a', t0Seconds: 0, bpm: 120, durationSeconds: 60 },
      { trackId: 'b', t0Seconds: 0, bpm: 120, durationSeconds: 60 },
    ]));
    expect(getTrack).toHaveBeenCalledTimes(2);
    expect(selector(['a', 'b'], 1)).toBe(first);
    expect(getTrack).toHaveBeenCalledTimes(2);

    selector(['b', 'a'], 2);
    expect(getTrack).toHaveBeenCalledTimes(4);
  });
});
