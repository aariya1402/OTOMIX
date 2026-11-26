import { describe, it, expect } from 'vitest';
import {
  emptyQueueState,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  setStarterTrack,
  clearQueue,
  selectQueueIds,
  selectStarterTrack,
  selectQueueLength,
  selectTrackAtSlot,
  type QueueState
} from '../src/state/queue';

describe('QueueSlice - Ordered Queue (P08-T01-S02-M01)', () => {
  it('emptyQueueState has the expected shape', () => {
    const state = emptyQueueState();
    expect(state.queueIds).toEqual([]);
  });

  describe('addToQueue', () => {
    it('adds first track as starter track', () => {
      const state = addToQueue(emptyQueueState(), 'track-a');
      expect(state.queueIds).toEqual(['track-a']);
    });

    it('appends subsequent tracks after starter', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-c');

      expect(state.queueIds).toEqual(['track-a', 'track-b', 'track-c']);
    });

    it('does not add duplicate track IDs', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-a'); // duplicate

      expect(state.queueIds).toEqual(['track-a', 'track-b']);
    });
  });

  describe('removeFromQueue', () => {
    it('removes track by ID and compacts array', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-c');
      state = removeFromQueue(state, 'track-b');

      expect(state.queueIds).toEqual(['track-a', 'track-c']);
    });

    it('removes starter track and next track becomes starter', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = removeFromQueue(state, 'track-a');

      expect(state.queueIds).toEqual(['track-b']);
    });

    it('returns same state for non-existent track', () => {
      const state = addToQueue(emptyQueueState(), 'track-a');
      const newState = removeFromQueue(state, 'non-existent');

      expect(newState).toBe(state);
    });

    it('clears queue when removing last track', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = removeFromQueue(state, 'track-a');

      expect(state.queueIds).toEqual([]);
    });
  });

  describe('reorderQueue', () => {
    it('moves track from one index to another', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-c');
      state = addToQueue(state, 'track-d');
      // queue: [a, b, c, d] - move c (index 2) to index 1
      state = reorderQueue(state, 2, 1);

      expect(state.queueIds).toEqual(['track-a', 'track-c', 'track-b', 'track-d']);
    });

    it('does not allow moving starter track (index 0)', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-c');
      // Try to move starter track
      state = reorderQueue(state, 0, 2);

      expect(state.queueIds).toEqual(['track-a', 'track-b', 'track-c']);
    });

    it('allows moving a track to index 0 to select a new starter', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-c');
      const previousState = state;
      state = reorderQueue(state, 2, 0);

      expect(state.queueIds).toEqual(['track-c', 'track-a', 'track-b']);
      expect(selectStarterTrack(state)).toBe('track-c');
      expect(previousState.queueIds).toEqual(['track-a', 'track-b', 'track-c']);
    });

    it('returns same state for invalid fromIndex', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = reorderQueue(state, 5, 1);

      expect(state.queueIds).toEqual(['track-a', 'track-b']);
    });

    it('returns same state for invalid toIndex', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = reorderQueue(state, 1, 5);

      expect(state.queueIds).toEqual(['track-a', 'track-b']);
    });

    it('returns same state for same fromIndex and toIndex', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = reorderQueue(state, 1, 1);

      expect(state.queueIds).toEqual(['track-a', 'track-b']);
    });
  });

  describe('setStarterTrack', () => {
    it('sets starter track on empty queue', () => {
      const state = setStarterTrack(emptyQueueState(), 'track-a');
      expect(state.queueIds).toEqual(['track-a']);
    });

    it('replaces existing starter track', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = setStarterTrack(state, 'track-c');

      expect(state.queueIds).toEqual(['track-c', 'track-a', 'track-b']);
    });

    it('moves existing track to starter position', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = addToQueue(state, 'track-c');
      // Move track-c to starter
      state = setStarterTrack(state, 'track-c');

      expect(state.queueIds).toEqual(['track-c', 'track-a', 'track-b']);
    });

    it('adds new track as starter when not in queue', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = setStarterTrack(state, 'track-new');

      expect(state.queueIds).toEqual(['track-new', 'track-a', 'track-b']);
    });
  });

  describe('clearQueue', () => {
    it('returns empty queue state', () => {
      let state = addToQueue(emptyQueueState(), 'track-a');
      state = addToQueue(state, 'track-b');
      state = clearQueue();

      expect(state.queueIds).toEqual([]);
    });
  });

  describe('selectors', () => {
    describe('selectQueueIds', () => {
      it('returns queue IDs in order', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        state = addToQueue(state, 'track-b');
        state = addToQueue(state, 'track-c');

        expect(selectQueueIds(state)).toEqual(['track-a', 'track-b', 'track-c']);
      });

      it('returns empty array for empty queue', () => {
        const state = emptyQueueState();
        expect(selectQueueIds(state)).toEqual([]);
      });
    });

    describe('selectStarterTrack', () => {
      it('returns first track as starter', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        state = addToQueue(state, 'track-b');

        expect(selectStarterTrack(state)).toBe('track-a');
      });

      it('returns null for empty queue', () => {
        const state = emptyQueueState();
        expect(selectStarterTrack(state)).toBeNull();
      });
    });

    describe('selectQueueLength', () => {
      it('returns number of tracks in queue', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        state = addToQueue(state, 'track-b');
        state = addToQueue(state, 'track-c');

        expect(selectQueueLength(state)).toBe(3);
      });

      it('returns 0 for empty queue', () => {
        const state = emptyQueueState();
        expect(selectQueueLength(state)).toBe(0);
      });
    });

    describe('selectTrackAtSlot', () => {
      it('returns track at slot 1 (starter)', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        state = addToQueue(state, 'track-b');

        expect(selectTrackAtSlot(state, 1)).toBe('track-a');
      });

      it('returns track at slot 2', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        state = addToQueue(state, 'track-b');

        expect(selectTrackAtSlot(state, 2)).toBe('track-b');
      });

      it('returns null for slot 0', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        expect(selectTrackAtSlot(state, 0)).toBeNull();
      });

      it('returns null for slot beyond queue length', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        expect(selectTrackAtSlot(state, 5)).toBeNull();
      });

      it('returns null for negative slot', () => {
        let state = addToQueue(emptyQueueState(), 'track-a');
        expect(selectTrackAtSlot(state, -1)).toBeNull();
      });
    });
  });

  // Test spec from the plan:
  // Input: add A,B,C; move C to index 0; remove B
  // Expected: queue [C,A]; slot 1 = C
  describe('Integration test - tasks.json spec', () => {
    it('matches the expected behavior from tasks.json', () => {
      let state = emptyQueueState();
      
      // add A, B, C
      state = addToQueue(state, 'A');
      state = addToQueue(state, 'B');
      state = addToQueue(state, 'C');
      // queue: [A, B, C]
      
      state = reorderQueue(state, 2, 0);
      // queue: [C, A, B]
      
      // remove B
      state = removeFromQueue(state, 'B');
      // queue: [C, A]
      
      expect(selectQueueIds(state)).toEqual(['C', 'A']);
      expect(selectStarterTrack(state)).toBe('C');
      expect(selectTrackAtSlot(state, 1)).toBe('C');
      expect(selectQueueLength(state)).toBe(2);
    });
  });
});