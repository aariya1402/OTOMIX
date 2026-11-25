// OTOMIX §4.9 · Memoized Timeline Selector (P08-T01-S02-M02)
//
// Computes the Absolute Locked Grid timeline for the entire queue based on
// track BPM, T0, and deltaQuanta. Uses tOfI from @otomix/core for absolute
// timestamp computation. Memoized to only recompute when queue or relevant
// track data changes.

import { tOfI, type BeatIndex, type BPM } from '@otomix/core';
import type { QueueState } from './queue.js';
import type { LibraryState, LibraryTrack } from './library.js';

/**
 * QueueTrack represents a track in the queue with all timing information
 * needed to compute its absolute timeline.
 */
export interface QueueTrack {
  readonly trackId: string;
  readonly bpm: BPM;
  readonly T0: number;
  readonly deltaQuanta: number;
  readonly duration: number;
}

/**
 * TimelinePoint represents a single beat in the absolute timeline.
 */
export interface TimelinePoint {
  readonly beatIndex: BeatIndex;
  readonly absoluteTime: number;
  readonly trackId: string;
}

/**
 * Pure function to compute the timeline for a list of queue tracks.
 * For each track, computes absolute timestamps for all beats from 1 to
 * the number of beats that fit within the track's duration.
 *
 * @param queueTracks - Array of tracks with timing information
 * @returns Array of timeline points sorted by absolute time
 */
export function computeTimeline(queueTracks: readonly QueueTrack[]): readonly TimelinePoint[] {
  const points: TimelinePoint[] = [];

  for (const track of queueTracks) {
    const period = 60 / track.bpm;
    // Calculate how many beats fit in the track's duration
    // Beat 1 is at T0, so we need to find max beat index where t(i) <= T0 + duration
    const maxBeats = Math.floor(track.duration / period) + 1;

    for (let beatNum = 1; beatNum <= maxBeats; beatNum++) {
      const beatIndex = beatNum as BeatIndex;
      const absoluteTime = tOfI(beatIndex, track.T0, track.bpm, track.deltaQuanta);
      points.push({
        beatIndex,
        absoluteTime,
        trackId: track.trackId,
      });
    }
  }

  // Sort by absolute time
  points.sort((a, b) => a.absoluteTime - b.absoluteTime);

  return Object.freeze(points);
}

/**
 * Internal state for memoization cache.
 */
interface TimelineCache {
  readonly queueIds: readonly string[];
  readonly trackData: Map<string, { bpm: number; T0: number; deltaQuanta: number; duration: number }>;
  readonly result: readonly TimelinePoint[];
}

/**
 * Creates a new empty cache.
 */
function createCache(): TimelineCache {
  return {
    queueIds: [],
    trackData: new Map(),
    result: Object.freeze([]),
  };
}

/**
 * Checks if the cache is valid for the given queue IDs and track data.
 */
function isCacheValid(
  cache: TimelineCache,
  queueIds: readonly string[],
  trackData: Map<string, { bpm: number; T0: number; deltaQuanta: number; duration: number }>
): boolean {
  // Check queue IDs match
  if (cache.queueIds.length !== queueIds.length) {
    return false;
  }
  for (let i = 0; i < queueIds.length; i++) {
    if (cache.queueIds[i] !== queueIds[i]) {
      return false;
    }
  }

  // Check track data matches
  if (cache.trackData.size !== trackData.size) {
    return false;
  }
  for (const [trackId, data] of trackData) {
    const cached = cache.trackData.get(trackId);
    if (!cached) {
      return false;
    }
    if (
      cached.bpm !== data.bpm ||
      cached.T0 !== data.T0 ||
      cached.deltaQuanta !== data.deltaQuanta ||
      cached.duration !== data.duration
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Memoized selector for the timeline.
 * Only recomputes when queue IDs or relevant track timing data changes.
 *
 * @param state - Combined state containing queue and library
 * @returns Timeline points for the entire queue
 */
export function selectTimeline(state: {
  readonly queue: QueueState;
  readonly library: LibraryState;
}): readonly TimelinePoint[] {
  // This is a module-level cache - in a real Redux setup this would be
  // in a selector factory or using reselect. For simplicity, we use
  // a closure-based cache.
  return selectTimelineWithCache(state, timelineCache);
}

// Module-level cache for memoization
const timelineCache = createCache();

/**
 * Internal function that uses the provided cache.
 * Exported for testing purposes to allow cache inspection/reset.
 */
export function selectTimelineWithCache(
  state: {
    readonly queue: QueueState;
    readonly library: LibraryState;
  },
  cache: TimelineCache
): readonly TimelinePoint[] {
  const queueIds = state.queue.queueIds;

  // Build track data map from library
  const trackData = new Map<string, { bpm: number; T0: number; deltaQuanta: number; duration: number }>();

  for (const trackId of queueIds) {
    const libraryTrack = state.library.byId[trackId];
    if (libraryTrack) {
      // Use default values for timing fields not in LibraryTrack
      // In a real implementation, these would come from track analysis
      trackData.set(trackId, {
        bpm: libraryTrack.bpm,
        T0: 0, // Would be computed from track analysis
        deltaQuanta: 0, // Would be computed from drift correction
        duration: 180, // Default 3 minutes, would come from track metadata
      });
    }
  }

  // Check cache validity
  if (isCacheValid(cache, queueIds, trackData)) {
    return cache.result;
  }

  // Build QueueTrack array for computeTimeline
  const queueTracks: QueueTrack[] = [];
  for (const trackId of queueIds) {
    const data = trackData.get(trackId);
    if (data) {
      queueTracks.push({
        trackId,
        bpm: data.bpm as BPM,
        T0: data.T0,
        deltaQuanta: data.deltaQuanta,
        duration: data.duration,
      });
    }
  }

  // Compute new timeline
  const result = computeTimeline(queueTracks);

  // Update cache
  cache.queueIds = queueIds;
  cache.trackData = trackData;
  cache.result = result;

  return result;
}

/**
 * Resets the memoization cache.
 * Exported for testing purposes.
 */
export function resetTimelineCache(): void {
  timelineCache.queueIds = [];
  timelineCache.trackData.clear();
  timelineCache.result = Object.freeze([]);
}

/**
 * Gets the current cache state for testing.
 * Exported for testing purposes.
 */
export function getTimelineCache(): Readonly<TimelineCache> {
  return {
    queueIds: timelineCache.queueIds,
    trackData: new Map(timelineCache.trackData),
    result: timelineCache.result,
  };
}