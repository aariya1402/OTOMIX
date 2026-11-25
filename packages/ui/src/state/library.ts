// OTOMIX §4.9 · Normalized Library Slice (P08-T01-S01-M02)
//
// Redux-shaped state for the track library. Keeps all tracks in a normalized
// byId map with an allIds array for insertion order. Provides a selectableIds
// selector that filters out unmixable tracks (mixability < 0.4).
//
// Rule: Wildcard tracks are kept in the library but flagged; they are not
//       selectable for normal mixing.

export const UNMIXABLE_THRESHOLD = 0.4;

export interface LibraryTrack {
  readonly trackId: string;
  readonly bpm: number;
  readonly camelotKey: string;
  readonly energyStars: number;
  readonly mixability: number;
  readonly isWildcard: boolean;
}

export interface LibraryState {
  readonly byId: Record<string, LibraryTrack>;
  readonly allIds: readonly string[];
}

export function emptyLibraryState(): LibraryState {
  return {
    byId: {},
    allIds: [],
  };
}

export function addTracks(
  state: LibraryState,
  tracks: readonly LibraryTrack[]
): LibraryState {
  const newById = { ...state.byId };
  const newAllIds = [...state.allIds];

  for (const track of tracks) {
    if (!(track.trackId in newById)) {
      newAllIds.push(track.trackId);
    }
    newById[track.trackId] = track;
  }

  return {
    byId: newById,
    allIds: newAllIds,
  };
}

export function removeTrack(state: LibraryState, trackId: string): LibraryState {
  if (!(trackId in state.byId)) {
    return state;
  }

  const { [trackId]: _removed, ...newById } = state.byId;
  const newAllIds = state.allIds.filter((id) => id !== trackId);

  return {
    byId: newById,
    allIds: newAllIds,
  };
}

export function clearLibrary(): LibraryState {
  return emptyLibraryState();
}

export function selectSelectableIds(state: LibraryState): readonly string[] {
  return state.allIds.filter((id) => {
    const track = state.byId[id];
    return track && track.mixability >= UNMIXABLE_THRESHOLD && !track.isWildcard;
  });
}

export function selectWildcardIds(state: LibraryState): readonly string[] {
  return state.allIds.filter((id) => {
    const track = state.byId[id];
    return track && track.isWildcard;
  });
}

export function selectTrackById(
  state: LibraryState,
  trackId: string
): LibraryTrack | undefined {
  return state.byId[trackId];
}

export function selectAllTracks(state: LibraryState): readonly LibraryTrack[] {
  return state.allIds.map((id) => state.byId[id]);
}