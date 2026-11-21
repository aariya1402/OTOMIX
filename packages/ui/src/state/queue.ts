export interface QueueState {
  readonly queueIndex: readonly string[];
  readonly starterTrackId: string | null;
}

export type QueueAction =
  | { type: 'queue/add'; trackId: string }
  | { type: 'queue/remove'; trackId: string }
  | { type: 'queue/reorder'; trackId: string; toIndex: number };

export function emptyQueueState(): QueueState {
  return { queueIndex: [], starterTrackId: null };
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  let next = [...state.queueIndex];
  if (action.type === 'queue/add') {
    if (!next.includes(action.trackId)) next.push(action.trackId);
  } else if (action.type === 'queue/remove') {
    next = next.filter((trackId) => trackId !== action.trackId);
  } else {
    const fromIndex = next.indexOf(action.trackId);
    if (fromIndex >= 0) {
      next.splice(fromIndex, 1);
      const safeIndex = Math.max(0, Math.min(action.toIndex, next.length));
      next.splice(safeIndex, 0, action.trackId);
    }
  }
  return { queueIndex: next, starterTrackId: next[0] ?? null };
}
