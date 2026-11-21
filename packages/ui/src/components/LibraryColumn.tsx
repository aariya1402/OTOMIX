import type { LibraryCatalogRow } from '../state/library.js';

export interface LibraryColumnProps {
  rows: readonly LibraryCatalogRow[];
  loading?: boolean;
  onAdd?: (trackId: string) => void;
}

export function LibraryColumn({ rows, loading = false, onAdd }: LibraryColumnProps) {
  if (loading) {
    return (
      <aside aria-label="Library loading" className="library-column">
        {['skeleton-a', 'skeleton-b', 'skeleton-c'].map((id) => (
          <div key={id} role="status" aria-label="Loading track" className="library-skeleton" />
        ))}
      </aside>
    );
  }

  return (
    <aside aria-label="Library" className="library-column">
      {rows.map((row) => (
        <button
          key={row.track_id}
          type="button"
          aria-label={`${row.track_id}, BPM ${row.bpm}, Key ${row.camelot_key}, Energy ${row.energy_stars}, Mixability ${row.mixability ?? 'wildcard'}`}
          onClick={() => onAdd?.(row.track_id)}
        >
          <span>{row.track_id}</span>
          <span>BPM {row.bpm}</span>
          <span>Key {row.camelot_key}</span>
          <span>Energy {row.energy_stars}</span>
          <span>Mixability {row.mixability ?? 'wildcard'}</span>
        </button>
      ))}
    </aside>
  );
}
