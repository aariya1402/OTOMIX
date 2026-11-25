// OTOMIX §4.9 · Library Column Component (P08-T02-S01-M01)
//
// Renders the left column library with BPM, Key, Energy Stars and Mixability,
// showing skeleton placeholders during WASM extraction.

import React from 'react';
import type { LibraryTrack } from '../state/library';

export interface LibraryColumnProps {
  readonly tracks: readonly LibraryTrack[];
  readonly loading: boolean;
  readonly selectableIds: readonly string[];
  readonly onTrackClick: (trackId: string) => void;
}

function SkeletonRow(): React.ReactElement {
  return (
    <div className="library-row skeleton" data-testid="skeleton-row">
      <div className="skeleton-cell skeleton-bpm" />
      <div className="skeleton-cell skeleton-key" />
      <div className="skeleton-cell skeleton-energy" />
      <div className="skeleton-cell skeleton-mixability" />
    </div>
  );
}

function TrackRow({
  track,
  isSelectable,
  onClick
}: {
  readonly track: LibraryTrack;
  readonly isSelectable: boolean;
  readonly onClick: () => void;
}): React.ReactElement {
  const energyStars = '★'.repeat(track.energyStars) + '☆'.repeat(5 - track.energyStars);
  const mixabilityPercent = Math.round(track.mixability * 100);

  const handleClick = () => {
    if (isSelectable) {
      onClick();
    }
  };

  return (
    <div
      className={`library-row ${isSelectable ? 'selectable' : 'unmixable'} ${track.isWildcard ? 'wildcard' : ''}`}
      data-testid={`track-row-${track.trackId}`}
      onClick={handleClick}
      style={{ opacity: isSelectable ? 1 : 0.5, cursor: isSelectable ? 'pointer' : 'not-allowed' }}
    >
      <div className="cell bpm" data-testid={`bpm-${track.trackId}`}>
        {track.bpm.toFixed(1)} BPM
      </div>
      <div className="cell key" data-testid={`key-${track.trackId}`}>
        {track.camelotKey}
      </div>
      <div className="cell energy" data-testid={`energy-${track.trackId}`}>
        <span className="energy-stars" aria-label={`${track.energyStars} out of 5 energy`}>
          {energyStars}
        </span>
      </div>
      <div className="cell mixability" data-testid={`mixability-${track.trackId}`}>
        <span className="mixability-bar">
          <span
            className="mixability-fill"
            style={{ width: `${mixabilityPercent}%` }}
          />
        </span>
        <span className="mixability-value">{mixabilityPercent}%</span>
      </div>
      {track.isWildcard && (
        <span className="wildcard-badge" data-testid={`wildcard-badge-${track.trackId}`}>
          Wildcard
        </span>
      )}
    </div>
  );
}

export function LibraryColumn({
  tracks,
  loading,
  selectableIds,
  onTrackClick
}: LibraryColumnProps): React.ReactElement {
  const selectableSet = new Set(selectableIds);

  if (loading) {
    return (
      <div className="library-column" data-testid="library-column">
        <div className="library-header">
          <h2 data-testid="library-title">Library</h2>
          <span className="track-count" data-testid="library-count">Loading...</span>
        </div>
        <div className="library-rows" data-testid="library-rows">
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="library-column" data-testid="library-column">
      <div className="library-header">
        <h2 data-testid="library-title">Library</h2>
        <span className="track-count" data-testid="library-count">
          {tracks.length} track{tracks.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="library-rows" data-testid="library-rows">
        {tracks.length === 0 ? (
          <div className="empty-state" data-testid="library-empty">
            No tracks in library
          </div>
        ) : (
          tracks.map(track => (
            <TrackRow
              key={track.trackId}
              track={track}
              isSelectable={selectableSet.has(track.trackId)}
              onClick={() => onTrackClick(track.trackId)}
            />
          ))
        )}
      </div>
    </div>
  );
}