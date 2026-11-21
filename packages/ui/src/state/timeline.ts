import { tOfI } from '@otomix/core';
import type { BPM } from '@otomix/core';

export interface TimelineTrack {
  readonly trackId: string;
  readonly t0Seconds: number;
  readonly bpm: number;
  readonly durationSeconds: number;
}

export interface TimelinePoint {
  readonly trackId: string;
  readonly beatIndex: number;
  readonly absoluteSeconds: number;
}

export interface TimelineState {
  readonly points: readonly TimelinePoint[];
}

export function computeTimeline(tracks: readonly TimelineTrack[]): TimelineState {
  const points: TimelinePoint[] = [];
  for (const track of tracks) {
    const beatCount = track.bpm > 0
      ? Math.max(0, Math.floor(track.durationSeconds * track.bpm / 60))
      : 0;
    for (let beatIndex = 1; beatIndex <= beatCount; beatIndex++) {
      points.push({
        trackId: track.trackId,
        beatIndex,
        absoluteSeconds: tOfI(
          beatIndex as unknown as Parameters<typeof tOfI>[0],
          track.t0Seconds,
          track.bpm as unknown as BPM,
          0,
        ),
      });
    }
  }
  return { points };
}

export function createTimelineSelector(
  getTrack: (trackId: string) => TimelineTrack | null,
) {
  let lastKey = '';
  let lastResult: TimelineState = { points: [] };
  return (queueIds: readonly string[], mutationVersion = 0): TimelineState => {
    const key = `${mutationVersion}:${queueIds.join('|')}`;
    if (key === lastKey) return lastResult;
    lastKey = key;
    const tracks = queueIds
      .map((trackId) => getTrack(trackId))
      .filter((track): track is TimelineTrack => track !== null);
    lastResult = computeTimeline(tracks);
    return lastResult;
  };
}
