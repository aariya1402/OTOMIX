export interface LibraryCatalogRow {
  readonly track_id: string;
  readonly bpm: number;
  readonly camelot_key: string;
  readonly energy_stars: number;
  readonly mixability: number | null;
  readonly wildcard?: boolean;
}

export interface LibraryState {
  readonly byId: Record<string, LibraryCatalogRow>;
  readonly allIds: readonly string[];
  readonly selectableIds: readonly string[];
  readonly wildcardIds: readonly string[];
  readonly unmixableIds: readonly string[];
}

export function createLibraryState(
  rows: readonly LibraryCatalogRow[],
  threshold = 0.40,
): LibraryState {
  const byId: Record<string, LibraryCatalogRow> = {};
  const allIds: string[] = [];
  const selectableIds: string[] = [];
  const wildcardIds: string[] = [];
  const unmixableIds: string[] = [];

  for (const row of rows) {
    byId[row.track_id] = row;
    allIds.push(row.track_id);
    selectableIds.push(row.track_id);
    if (row.wildcard) {
      wildcardIds.push(row.track_id);
      continue;
    }
    if (row.mixability === null) {
      wildcardIds.push(row.track_id);
    } else if (row.mixability < threshold) {
      unmixableIds.push(row.track_id);
    }
  }

  return { byId, allIds, selectableIds, wildcardIds, unmixableIds };
}
