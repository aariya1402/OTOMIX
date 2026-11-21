import { describe, it, expect } from 'vitest';
import { emptyQueueState, queueReducer } from '../src/state/queue';

describe('P08-T01-S02-M01 queue slice', () => {
  it('adds, reorders and removes while Slot 1 follows the first queue id', () => {
    let state = emptyQueueState();
    state = queueReducer(state, { type: 'queue/add', trackId: 'A' });
    state = queueReducer(state, { type: 'queue/add', trackId: 'B' });
    state = queueReducer(state, { type: 'queue/add', trackId: 'C' });
    state = queueReducer(state, { type: 'queue/reorder', trackId: 'C', toIndex: 0 });
    state = queueReducer(state, { type: 'queue/remove', trackId: 'B' });

    expect(state.queueIndex).toEqual(['C', 'A']);
    expect(state.starterTrackId).toBe('C');
  });
});
