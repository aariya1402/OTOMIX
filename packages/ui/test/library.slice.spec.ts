import { describe, it, expect } from 'vitest';
import {
  emptyLibraryState,
  addTracks,
  removeTrack,
  clearLibrary,
  selectSelectableIds,
  selectWildcardIds,
  selectTrackById,
  selectAllTracks,
  type LibraryState,
  type LibraryTrack,
  UNMIXABLE_THRESHOLD
} from '../src/state/library';

describe('LibrarySlice - Normalized Library (P08-T01-S01-M02)', () => {
  const createTrack = (overrides: Partial<LibraryTrack> = {}): LibraryTrack => ({
    trackId: 'track-1',
    bpm: 128,
    camelotKey: '8A',
    energyStars: 3,
    mixability: 0.8,
    isWildcard: false,
    ...overrides
  });

  it('emptyLibraryState has the expected shape', () => {
    const state = emptyLibraryState();
    expect(state.byId).toEqual({});
    expect(state.allIds).toEqual([]);
  });

  it('addTracks adds tracks to byId and allIds in insertion order', () => {
    const tracks = [
      createTrack({ trackId: 'track-a', mixability: 0.9 }),
      createTrack({ trackId: 'track-b', mixability: 0.7 }),
      createTrack({ trackId: 'track-c', mixability: 0.5 })
    ];
    const state = addTracks(emptyLibraryState(), tracks);

    expect(state.allIds).toEqual(['track-a', 'track-b', 'track-c']);
    expect(state.byId['track-a']).toEqual(tracks[0]);
    expect(state.byId['track-b']).toEqual(tracks[1]);
    expect(state.byId['track-c']).toEqual(tracks[2]);
  });

  it('addTracks does not duplicate track IDs in allIds', () => {
    const track = createTrack({ trackId: 'track-dup', mixability: 0.8 });
    let state = addTracks(emptyLibraryState(), [track]);
    state = addTracks(state, [track]);

    expect(state.allIds).toEqual(['track-dup']);
    expect(Object.keys(state.byId)).toEqual(['track-dup']);
  });

  it('removeTrack removes track from byId and allIds', () => {
    const tracks = [
      createTrack({ trackId: 'track-a', mixability: 0.9 }),
      createTrack({ trackId: 'track-b', mixability: 0.7 })
    ];
    let state = addTracks(emptyLibraryState(), tracks);
    state = removeTrack(state, 'track-a');

    expect(state.allIds).toEqual(['track-b']);
    expect('track-a' in state.byId).toBe(false);
    expect(state.byId['track-b']).toEqual(tracks[1]);
  });

  it('removeTrack on non-existent track returns same state', () => {
    const state = addTracks(emptyLibraryState(), [createTrack({ trackId: 'track-a' })]);
    const newState = removeTrack(state, 'non-existent');

    expect(newState).toBe(state);
  });

  it('clearLibrary returns empty state', () => {
    const state = addTracks(emptyLibraryState(), [createTrack({ trackId: 'track-a' })]);
    const cleared = clearLibrary();

    expect(cleared.byId).toEqual({});
    expect(cleared.allIds).toEqual([]);
  });

  describe('selectSelectableIds', () => {
    it('filters out tracks below UNMIXABLE_THRESHOLD (0.4)', () => {
      const tracks = [
        createTrack({ trackId: 'low-mix', mixability: 0.39 }),
        createTrack({ trackId: 'threshold-mix', mixability: 0.40 }),
        createTrack({ trackId: 'high-mix', mixability: 0.8 })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const selectable = selectSelectableIds(state);
      expect(selectable).toEqual(['threshold-mix', 'high-mix']);
    });

    it('filters out wildcard tracks', () => {
      const tracks = [
        createTrack({ trackId: 'normal', mixability: 0.8, isWildcard: false }),
        createTrack({ trackId: 'wildcard', mixability: 0.9, isWildcard: true })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const selectable = selectSelectableIds(state);
      expect(selectable).toEqual(['normal']);
    });

    it('filters out both low mixability and wildcard tracks', () => {
      const tracks = [
        createTrack({ trackId: 'low-mix', mixability: 0.39, isWildcard: false }),
        createTrack({ trackId: 'wildcard-low', mixability: 0.39, isWildcard: true }),
        createTrack({ trackId: 'wildcard-high', mixability: 0.9, isWildcard: true }),
        createTrack({ trackId: 'selectable', mixability: 0.5, isWildcard: false })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const selectable = selectSelectableIds(state);
      expect(selectable).toEqual(['selectable']);
    });

    it('returns empty array when no tracks are selectable', () => {
      const tracks = [
        createTrack({ trackId: 'low-mix', mixability: 0.39 }),
        createTrack({ trackId: 'wildcard', mixability: 0.9, isWildcard: true })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const selectable = selectSelectableIds(state);
      expect(selectable).toEqual([]);
    });
  });

  describe('selectWildcardIds', () => {
    it('returns only wildcard track IDs', () => {
      const tracks = [
        createTrack({ trackId: 'normal', mixability: 0.8, isWildcard: false }),
        createTrack({ trackId: 'wildcard-1', mixability: 0.9, isWildcard: true }),
        createTrack({ trackId: 'wildcard-2', mixability: 0.3, isWildcard: true })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const wildcards = selectWildcardIds(state);
      expect(wildcards).toEqual(['wildcard-1', 'wildcard-2']);
    });

    it('returns empty array when no wildcards', () => {
      const tracks = [
        createTrack({ trackId: 'normal-1', mixability: 0.8 }),
        createTrack({ trackId: 'normal-2', mixability: 0.9 })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const wildcards = selectWildcardIds(state);
      expect(wildcards).toEqual([]);
    });
  });

  describe('selectTrackById', () => {
    it('returns track when found', () => {
      const track = createTrack({ trackId: 'track-a', mixability: 0.8 });
      const state = addTracks(emptyLibraryState(), [track]);

      const found = selectTrackById(state, 'track-a');
      expect(found).toEqual(track);
    });

    it('returns undefined when not found', () => {
      const state = addTracks(emptyLibraryState(), [createTrack({ trackId: 'track-a' })]);

      const found = selectTrackById(state, 'track-b');
      expect(found).toBeUndefined();
    });
  });

  describe('selectAllTracks', () => {
    it('returns all tracks in insertion order', () => {
      const tracks = [
        createTrack({ trackId: 'track-a', mixability: 0.8 }),
        createTrack({ trackId: 'track-b', mixability: 0.7 }),
        createTrack({ trackId: 'track-c', mixability: 0.9 })
      ];
      const state = addTracks(emptyLibraryState(), tracks);

      const all = selectAllTracks(state);
      expect(all).toEqual(tracks);
    });

    it('returns empty array for empty library', () => {
      const state = emptyLibraryState();
      const all = selectAllTracks(state);
      expect(all).toEqual([]);
    });
  });

  describe('UNMIXABLE_THRESHOLD constant', () => {
    it('is 0.4', () => {
      expect(UNMIXABLE_THRESHOLD).toBe(0.4);
    });
  });
});