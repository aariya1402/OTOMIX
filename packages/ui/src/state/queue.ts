// OTOMIX §4.9 · Ordered Queue Slice (P08-T01-S02-M01)
//
// Redux-shaped state for the ordered track queue. Slot 1 (index 0) is always
// the Starter Track. Provides actions for adding, removing, reordering, and
// managing the starter track.
//
// Rule: The starter track at index 0 is immutable in position - it can be
//       replaced but never moved from index 0 via reorder.

export interface QueueState {
  readonly queueIds: readonly string[];
}

export function emptyQueueState(): QueueState {
  return {
    queueIds: [],
  };
}

export function addToQueue(state: QueueState, trackId: string): QueueState {
  // Don't add duplicates
  if (state.queueIds.includes(trackId)) {
    return state;
  }

  // If queue is empty, this becomes the starter track
  if (state.queueIds.length === 0) {
    return {
      queueIds: [trackId],
    };
  }

  // Append to the end (after starter track)
  return {
    queueIds: [...state.queueIds, trackId],
  };
}

export function removeFromQueue(state: QueueState, trackId: string): QueueState {
  const index = state.queueIds.indexOf(trackId);
  if (index === -1) {
    return state;
  }

  const newQueueIds = state.queueIds.filter((id) => id !== trackId);

  return {
    queueIds: newQueueIds,
  };
}

export function reorderQueue(state: QueueState, fromIndex: number, toIndex: number): QueueState {
  // Cannot move starter track (index 0) from its position
  if (fromIndex === 0) {
    return state;
  }

  // Cannot move to index 0 (starter track position)
  if (toIndex === 0) {
    return state;
  }

  // Validate indices
  if (fromIndex < 0 || fromIndex >= state.queueIds.length) {
    return state;
  }
  if (toIndex < 0 || toIndex >= state.queueIds.length) {
    return state;
  }

  // No-op if same index
  if (fromIndex === toIndex) {
    return state;
  }

  const newQueueIds = [...state.queueIds];
  const [removed] = newQueueIds.splice(fromIndex, 1);
  newQueueIds.splice(toIndex, 0, removed);

  return {
    queueIds: newQueueIds,
  };
}

export function setStarterTrack(state: QueueState, trackId: string): QueueState {
  // If track is already in queue, remove it first
  const withoutTrack = state.queueIds.filter((id) => id !== trackId);

  // Insert at index 0 (starter position)
  return {
    queueIds: [trackId, ...withoutTrack],
  };
}

export function clearQueue(): QueueState {
  return emptyQueueState();
}

// Selectors
export function selectQueueIds(state: QueueState): readonly string[] {
  return state.queueIds;
}

export function selectStarterTrack(state: QueueState): string | null {
  return state.queueIds[0] ?? null;
}

export function selectQueueLength(state: QueueState): number {
  return state.queueIds.length;
}

export function selectTrackAtSlot(state: QueueState, slot: number): string | null {
  if (slot < 1 || slot > state.queueIds.length) {
    return null;
  }
  return state.queueIds[slot - 1];
}