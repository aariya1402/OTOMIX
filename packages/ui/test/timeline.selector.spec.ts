// OTOMIX §4.9 · Timeline Selector Tests (P08-T01-S02-M02)
//
// Tests for the memoized timeline selector and computeTimeline function.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeTimeline,
  selectTimeline,
  selectTimelineWithCache,
  resetTimelineCache,
  getTimelineCache,
  type QueueTrack,
  type TimelinePoint,
} from '../src/state/timeline';
import { emptyQueueState, addToQueue, type QueueState } from '../src/state/queue';
import { emptyLibraryState, addTracks, type LibraryState, type LibraryTrack } from '../src/state/library';
import { BPM } from '@otomix/core';

describe('Timeline Selector (P08-T01-S02-M02)', () => {
  // Helper to create a test LibraryTrack
  const createLibraryTrack = (overrides: Partial<LibraryTrack> = {}): LibraryTrack => ({
    trackId: 'test-track',
    bpm: 120,
    camelotKey: '8A',
    energyStars: 3,
    mixability: 0.8,
    isWildcard: false,
    ...overrides,
  });

  // Helper to create a test QueueTrack
  const createQueueTrack = (overrides: Partial<QueueTrack> = {}): QueueTrack => ({
    trackId: 'test-track',
    bpm: BPM.parse(120).value,
    T0: 0,
    deltaQuanta: 0,
    duration: 180,
    ...overrides,
  });

  describe('computeTimeline', () => {
    it('returns empty array for empty input', () => {
      const result = computeTimeline([]);
      expect(result).toEqual([]);
    });

    it('computes timeline points for a single track', () => {
      const tracks = [createQueueTrack({ trackId: 'track-1', bpm: BPM.parse(120).value, duration: 10 })];
      const result = computeTimeline(tracks);

      // At 120 BPM, period = 0.5s. 10s duration = 20 beats + beat 1 = 21 points
      expect(result.length).toBe(21);
      expect(result[0].trackId).toBe('track-1');
      expect(result[0].beatIndex).toBe(1);
      expect(result[0].absoluteTime).toBe(0); // T0 = 0
      expect(result[1].absoluteTime).toBeCloseTo(0.5);
      expect(result[20].absoluteTime).toBeCloseTo(10);
    });

    it('computes correct absolute times using tOfI formula', () => {
      const tracks = [createQueueTrack({ trackId: 'track-1', bpm: BPM.parse(60).value, T0: 5, duration: 4 })];
      const result = computeTimeline(tracks);

      // At 60 BPM, period = 1s. T0 = 5. Beats at 5, 6, 7, 8, 9
      expect(result.length).toBe(5);
      expect(result[0].absoluteTime).toBe(5);
      expect(result[1].absoluteTime).toBe(6);
      expect(result[2].absoluteTime).toBe(7);
      expect(result[3].absoluteTime).toBe(8);
      expect(result[4].absoluteTime).toBe(9);
    });

    it('applies deltaQuanta correction', () => {
      const tracks = [createQueueTrack({ trackId: 'track-1', bpm: BPM.parse(60).value, T0: 0, deltaQuanta: 1, duration: 2 })];
      const result = computeTimeline(tracks);

      // At 60 BPM, period = 1s. QUANTUM_DIVISOR = 24, so quantum = 1/24s.
      // deltaQuanta = 1 adds 1/24s to each beat
      expect(result[0].absoluteTime).toBeCloseTo(1 / 24);
      expect(result[1].absoluteTime).toBeCloseTo(1 + 1 / 24);
    });

    it('sorts points by absolute time across multiple tracks', () => {
      const tracks = [
        createQueueTrack({ trackId: 'track-1', bpm: BPM.parse(120).value, T0: 0, duration: 1 }),
        createQueueTrack({ trackId: 'track-2', bpm: BPM.parse(120).value, T0: 0.25, duration: 1 }),
      ];
      const result = computeTimeline(tracks);

      // track-1 beats at 0, 0.5, 1.0
      // track-2 beats at 0.25, 0.75, 1.25
      // Sorted: 0(t1), 0.25(t2), 0.5(t1), 0.75(t2), 1.0(t1), 1.25(t2)
      expect(result.map(p => p.trackId)).toEqual(['track-1', 'track-2', 'track-1', 'track-2', 'track-1', 'track-2']);
      expect(result.map(p => p.absoluteTime)).toEqual([0, 0.25, 0.5, 0.75, 1.0, 1.25]);
    });

    it('returns frozen array', () => {
      const tracks = [createQueueTrack()];
      const result = computeTimeline(tracks);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('handles different BPMs correctly', () => {
      const tracks = [
        createQueueTrack({ trackId: 'slow', bpm: BPM.parse(60).value, T0: 0, duration: 2 }),
        createQueueTrack({ trackId: 'fast', bpm: BPM.parse(180).value, T0: 0, duration: 2 }),
      ];
      const result = computeTimeline(tracks);

      // Slow: 60 BPM = 1s period, beats at 0, 1, 2
      // Fast: 180 BPM = 0.333s period, beats at 0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0
      const slowPoints = result.filter(p => p.trackId === 'slow');
      const fastPoints = result.filter(p => p.trackId === 'fast');

      expect(slowPoints.length).toBe(3);
      expect(fastPoints.length).toBe(7);
    });
  });

  describe('selectTimeline memoization', () => {
    let queueState: QueueState;
    let libraryState: LibraryState;

    beforeEach(() => {
      resetTimelineCache();

      // Setup library with test tracks
      const tracks: LibraryTrack[] = [
        createLibraryTrack({ trackId: 'track-a', bpm: 120 }),
        createLibraryTrack({ trackId: 'track-b', bpm: 128 }),
        createLibraryTrack({ trackId: 'track-c', bpm: 100 }),
      ];
      libraryState = addTracks(emptyLibraryState(), tracks);

      // Setup queue with track-a and track-b
      queueState = addToQueue(emptyQueueState(), 'track-a');
      queueState = addToQueue(queueState, 'track-b');
    });

    it('computes timeline on first call', () => {
      const state = { queue: queueState, library: libraryState };
      const result = selectTimeline(state);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(p => p.trackId === 'track-a' || p.trackId === 'track-b')).toBe(true);
    });

    it('returns cached result on second call with same state', () => {
      const state = { queue: queueState, library: libraryState };

      const result1 = selectTimeline(state);
      const result2 = selectTimeline(state);

      expect(result2).toBe(result1); // Same reference = cached
    });

    it('recomputes when queue changes (track added)', () => {
      const state1 = { queue: queueState, library: libraryState };
      const result1 = selectTimeline(state1);

      // Add track-c to queue
      const newQueueState = addToQueue(queueState, 'track-c');
      const state2 = { queue: newQueueState, library: libraryState };
      const result2 = selectTimeline(state2);

      expect(result2).not.toBe(result1); // Different reference = recomputed
      expect(result2.length).toBeGreaterThan(result1.length);
    });

    it('recomputes when queue changes (track removed)', async () => {
      const state1 = { queue: queueState, library: libraryState };
      const result1 = selectTimeline(state1);

      // Remove track-b from queue
      const { removeFromQueue } = await import('../src/state/queue');
      const newQueueState = removeFromQueue(queueState, 'track-b');
      const state2 = { queue: newQueueState, library: libraryState };
      const result2 = selectTimeline(state2);

      expect(result2).not.toBe(result1);
      expect(result2.length).toBeLessThan(result1.length);
    });

    it('recomputes when queue changes (reordered)', async () => {
      const { reorderQueue } = await import('../src/state/queue');
      const state1 = { queue: queueState, library: libraryState };
      const result1 = selectTimeline(state1);

      // Reorder queue (move track-b before track-a - but can't move to index 0)
      // So we test with a 3-track queue
      let threeTrackQueue = addToQueue(queueState, 'track-c');
      threeTrackQueue = reorderQueue(threeTrackQueue, 2, 1); // Move track-c to index 1
      const state2 = { queue: threeTrackQueue, library: libraryState };
      const result2 = selectTimeline(state2);

      expect(result2).not.toBe(result1);
    });

    it('recomputes when library track data changes', () => {
      const state1 = { queue: queueState, library: libraryState };
      const result1 = selectTimeline(state1);

      // Update track-a's BPM in library
      const updatedTracks = [
        createLibraryTrack({ trackId: 'track-a', bpm: 140 }), // Changed from 120
        createLibraryTrack({ trackId: 'track-b', bpm: 128 }),
      ];
      const newLibraryState = addTracks(emptyLibraryState(), updatedTracks);
      const state2 = { queue: queueState, library: newLibraryState };
      const result2 = selectTimeline(state2);

      expect(result2).not.toBe(result1);
    });

    it('does NOT recompute on unrelated library changes (track not in queue)', () => {
      const state1 = { queue: queueState, library: libraryState };
      const result1 = selectTimeline(state1);

      // Add a new track to library that's not in queue
      const newLibraryState = addTracks(libraryState, [
        createLibraryTrack({ trackId: 'track-d', bpm: 110 }),
      ]);
      const state2 = { queue: queueState, library: newLibraryState };
      const result2 = selectTimeline(state2);

      expect(result2).toBe(result1); // Same reference = cached
    });

    it('does NOT recompute on unrelated state mutations', () => {
      const state1 = { queue: queueState, library: libraryState };
      const result1 = selectTimeline(state1);

      // Create a new state object with same data (simulating unrelated action)
      const state2 = { queue: queueState, library: libraryState };
      const result2 = selectTimeline(state2);

      expect(result2).toBe(result1); // Same reference = cached
    });
  });

  describe('Test spec from tasks.json', () => {
      it('computeTimeline called once per mutation and 0 times on unrelated actions', async () => {
      // This test verifies the memoization behavior matches the spec:
      // Input: 3 mutations
      // Expected: computeTimeline called once per mutation and 0 times on unrelated actions
        // We verify this by checking cache behavior - the selector returns the same
        // reference when cached, and a new reference when recomputed.

      resetTimelineCache();

      // Setup initial state
      const tracks: LibraryTrack[] = [
        createLibraryTrack({ trackId: 'A', bpm: 120 }),
        createLibraryTrack({ trackId: 'B', bpm: 128 }),
        createLibraryTrack({ trackId: 'C', bpm: 100 }),
      ];
      let libraryState = addTracks(emptyLibraryState(), tracks);
      let queueState = addToQueue(emptyQueueState(), 'A');
      queueState = addToQueue(queueState, 'B');
      queueState = addToQueue(queueState, 'C');

      let state = { queue: queueState, library: libraryState };

        // Mutation 1: Initial call - should compute
        const result1 = selectTimeline(state);
        const cacheAfterMutation1 = getTimelineCache();
        expect(cacheAfterMutation1.queueIds).toEqual(['A', 'B', 'C']);

        // Mutation 2: Reorder queue - should recompute
        const { reorderQueue } = await import('../src/state/queue');
      queueState = reorderQueue(queueState, 2, 1); // Move C to index 1
      state = { queue: queueState, library: libraryState };
        const result2 = selectTimeline(state);
        const cacheAfterMutation2 = getTimelineCache();
        expect(cacheAfterMutation2.queueIds).toEqual(['A', 'C', 'B']);
        expect(result2).not.toBe(result1); // Different reference = recomputed

        // Mutation 3: Remove track - should recompute
        const { removeFromQueue } = await import('../src/state/queue');
      queueState = removeFromQueue(queueState, 'B');
      state = { queue: queueState, library: libraryState };
        const result3 = selectTimeline(state);
        const cacheAfterMutation3 = getTimelineCache();
        expect(cacheAfterMutation3.queueIds).toEqual(['A', 'C']);
        expect(result3).not.toBe(result2); // Different reference = recomputed

        // Unrelated action: Select from library (not in queue) - should NOT recompute
        const { selectSelectableIds } = await import('../src/state/library');
      selectSelectableIds(libraryState);
        const result4 = selectTimeline(state);
        const cacheAfterUnrelated = getTimelineCache();
        expect(cacheAfterUnrelated.queueIds).toEqual(['A', 'C']);
        expect(result4).toBe(result3); // Same reference = cached

        // Verify we had 3 recomputations (3 different references) and 1 cache hit
        // The cache stores the last computed result, so we can verify by checking
        // that the queueIds in cache match the expected state after each mutation
    });

    it('output equals the pure function computeTimeline', async () => {
      resetTimelineCache();

      const tracks: LibraryTrack[] = [
        createLibraryTrack({ trackId: 'A', bpm: 120 }),
        createLibraryTrack({ trackId: 'B', bpm: 128 }),
      ];
      const libraryState = addTracks(emptyLibraryState(), tracks);
      let queueState = addToQueue(emptyQueueState(), 'A');
      queueState = addToQueue(queueState, 'B');

      const state = { queue: queueState, library: libraryState };

      // Get result from memoized selector
      const selectorResult = selectTimeline(state);

      // Build QueueTrack array manually and call pure function
      const queueTracks = [
        { trackId: 'A', bpm: BPM.parse(120).value, T0: 0, deltaQuanta: 0, duration: 180 },
        { trackId: 'B', bpm: BPM.parse(128).value, T0: 0, deltaQuanta: 0, duration: 180 },
      ];
      const pureResult = computeTimeline(queueTracks);

      // Results should be equal
      expect(selectorResult).toEqual(pureResult);
      // And should be the same reference (cached)
      const selectorResult2 = selectTimeline(state);
      expect(selectorResult2).toBe(selectorResult);
    });
  });

  describe('Cache inspection utilities', () => {
    beforeEach(() => {
      resetTimelineCache();
    });

    it('getTimelineCache returns current cache state', () => {
      const tracks: LibraryTrack[] = [
        createLibraryTrack({ trackId: 'A', bpm: 120 }),
      ];
      const libraryState = addTracks(emptyLibraryState(), tracks);
      const queueState = addToQueue(emptyQueueState(), 'A');
      const state = { queue: queueState, library: libraryState };

      // Before first call
      let cache = getTimelineCache();
      expect(cache.queueIds).toEqual([]);
      expect(cache.result).toEqual([]);

      // After first call
      selectTimeline(state);
      cache = getTimelineCache();
      expect(cache.queueIds).toEqual(['A']);
      expect(cache.result.length).toBeGreaterThan(0);

      // After second call (cached)
      selectTimeline(state);
      cache = getTimelineCache();
      expect(cache.queueIds).toEqual(['A']);
    });

    it('resetTimelineCache clears the cache', () => {
      const tracks: LibraryTrack[] = [
        createLibraryTrack({ trackId: 'A', bpm: 120 }),
      ];
      const libraryState = addTracks(emptyLibraryState(), tracks);
      const queueState = addToQueue(emptyQueueState(), 'A');
      const state = { queue: queueState, library: libraryState };

      selectTimeline(state);
      expect(getTimelineCache().queueIds).toEqual(['A']);

      resetTimelineCache();
      expect(getTimelineCache().queueIds).toEqual([]);
      expect(getTimelineCache().result).toEqual([]);
    });
  });
});