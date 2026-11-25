// OTOMIX §4.9 · Queue Column Component (P08-T02-S01-M02)
//
// Renders the right column queue with drag-and-drop add/reorder
// and an explicit empty state.

import React, { useState, useCallback } from 'react';
import type { LibraryTrack } from '../state/library';

export interface QueueColumnProps {
  readonly queueIds: readonly string[];
  readonly libraryTracks: Readonly<Record<string, LibraryTrack>>;
  readonly onAddToQueue: (trackId: string) => void;
  readonly onRemoveFromQueue: (trackId: string) => void;
  readonly onReorderQueue: (fromIndex: number, toIndex: number) => void;
  readonly onSetStarterTrack: (trackId: string) => void;
}

function EmptyState({ onDrop, onDragOver }: { readonly onDrop: (e: React.DragEvent) => void; readonly onDragOver: (e: React.DragEvent) => void }): React.ReactElement {
  return (
    <div
      className="queue-empty-state"
      data-testid="queue-empty-state"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="empty-icon" aria-hidden="true">🎵</div>
      <h3 data-testid="empty-title">Drop tracks here to start your mix</h3>
      <p data-testid="empty-subtitle">Drag tracks from the library to build your queue</p>
    </div>
  );
}

function QueueRow({
  track,
  index,
  isStarter,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onSetAsStarter
}: {
  readonly track: LibraryTrack;
  readonly index: number;
  readonly isStarter: boolean;
  readonly onDragStart: (e: React.DragEvent, trackId: string, index: number) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent, targetIndex: number) => void;
  readonly onDragEnd: (e: React.DragEvent) => void;
  readonly onRemove: (trackId: string) => void;
  readonly onSetAsStarter: (trackId: string) => void;
}): React.ReactElement {
  const energyStars = '★'.repeat(track.energyStars) + '☆'.repeat(5 - track.energyStars);
  const mixabilityPercent = Math.round(track.mixability * 100);
  const slotNumber = index + 1;

  return (
    <div
      className={`queue-row ${isStarter ? 'starter' : ''}`}
      data-testid={`queue-row-${track.trackId}`}
      draggable={true}
      onDragStart={(e) => onDragStart(e, track.trackId, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <div className="slot-number" data-testid={`slot-${slotNumber}`}>
        {slotNumber}
        {isStarter && <span className="starter-badge" data-testid={`starter-badge-${track.trackId}`}>★</span>}
      </div>
      <div className="track-info">
        <div className="track-main">
          <span className="bpm" data-testid={`queue-bpm-${track.trackId}`}>
            {track.bpm.toFixed(1)} BPM
          </span>
          <span className="key" data-testid={`queue-key-${track.trackId}`}>
            {track.camelotKey}
          </span>
        </div>
        <div className="track-meta">
          <span className="energy-stars" data-testid={`queue-energy-${track.trackId}`} aria-label={`${track.energyStars} out of 5 energy`}>
            {energyStars}
          </span>
          <span className="mixability" data-testid={`queue-mixability-${track.trackId}`}>
            {mixabilityPercent}%
          </span>
        </div>
      </div>
      <div className="track-actions">
        {isStarter ? (
          <span className="starter-locked" data-testid={`starter-locked-${track.trackId}`} title="Starter track (Slot 1)">
            🔒
          </span>
        ) : (
          <>
            <button
              className="action-btn set-starter"
              data-testid={`set-starter-${track.trackId}`}
              onClick={(e) => {
                e.stopPropagation();
                onSetAsStarter(track.trackId);
              }}
              title="Set as Starter Track"
            >
              ⭐
            </button>
            <button
              className="action-btn remove"
              data-testid={`remove-${track.trackId}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(track.trackId);
              }}
              title="Remove from queue"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function QueueColumn({
  queueIds,
  libraryTracks,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onSetStarterTrack
}: QueueColumnProps): React.ReactElement {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, trackId: string, index: number) => {
    // Don't allow dragging the starter track (index 0)
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', trackId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    // Don't allow dropping onto the starter track position (index 0)
    if (targetIndex === 0) return;
    
    // Don't allow dropping onto itself
    if (draggedIndex === targetIndex) return;
    
    onReorderQueue(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, onReorderQueue]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDropFromLibrary = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const trackId = e.dataTransfer.getData('text/plain');
    if (trackId && !queueIds.includes(trackId)) {
      onAddToQueue(trackId);
    }
  }, [queueIds, onAddToQueue]);

  const handleDragOverFromLibrary = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  if (queueIds.length === 0) {
    return (
      <div className="queue-column" data-testid="queue-column">
        <div className="queue-header">
          <h2 data-testid="queue-title">Queue</h2>
          <span className="track-count" data-testid="queue-count">0 tracks</span>
        </div>
        <div className="queue-rows" data-testid="queue-rows">
          <EmptyState
            onDrop={handleDropFromLibrary}
            onDragOver={handleDragOverFromLibrary}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="queue-column" data-testid="queue-column">
      <div className="queue-header">
        <h2 data-testid="queue-title">Queue</h2>
        <span className="track-count" data-testid="queue-count">
          {queueIds.length} track{queueIds.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div
        className="queue-rows"
        data-testid="queue-rows"
        onDrop={handleDropFromLibrary}
        onDragOver={handleDragOverFromLibrary}
      >
        {queueIds.map((trackId, index) => {
          const track = libraryTracks[trackId];
          if (!track) return null;
          
          return (
            <QueueRow
              key={trackId}
              track={track}
              index={index}
              isStarter={index === 0}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onRemove={onRemoveFromQueue}
              onSetAsStarter={onSetStarterTrack}
            />
          );
        })}
      </div>
    </div>
  );
}