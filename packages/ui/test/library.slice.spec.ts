import { describe, it, expect } from 'vitest';
import { createLibraryState } from '../src/state/library';

describe('P08-T01-S01-M02 library slice', () => {
  it('keeps low-mixability and wildcard rows selectable while classifying them for warnings', () => {
    const state = createLibraryState([
      { track_id: 'a', bpm: 120, camelot_key: '1A', energy_stars: 3, mixability: 0.39 },
      { track_id: 'b', bpm: 120, camelot_key: '1A', energy_stars: 3, mixability: 0.40 },
      { track_id: 'c', bpm: 120, camelot_key: '1A', energy_stars: 3, mixability: null, wildcard: true },
    ]);

    expect(state.allIds).toEqual(['a', 'b', 'c']);
    expect(state.selectableIds).toEqual(['a', 'b', 'c']);
    expect(state.wildcardIds).toEqual(['c']);
    expect(state.unmixableIds).toEqual(['a']);
  });
});
