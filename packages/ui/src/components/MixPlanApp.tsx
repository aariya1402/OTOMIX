// OTOMIX §4.9 · MixPlan App Component (P08-T02-S02-M01)
//
// Main two-column layout combining LibraryColumn and QueueColumn.
// Connects to Redux-style state slices for library and queue.

import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import { LibraryColumn } from './LibraryColumn';
import { QueueColumn } from './QueueColumn';
import type { LibraryTrack } from '../state/library';
import type { QueueState } from '../state/queue';
import type { LibraryState } from '../state/library';
import { selectSelectableIds } from '../state/library';
import { selectQueueIds, selectStarterTrack } from '../state/queue';
import { selectTimeline } from '../state/timeline';
import { hasStarterTrackWarning } from '../state/starter-warning';
import { PreviewStatus } from './PreviewStatus';
import type { PreviewController } from '../preview/controller';

export interface MixPlanAppProps {
  readonly libraryState: LibraryState;
  readonly queueState: QueueState;
  readonly onAddToQueue: (trackId: string) => void;
  readonly onRemoveFromQueue: (trackId: string) => void;
  readonly onReorderQueue: (fromIndex: number, toIndex: number) => void;
  readonly onSetStarterTrack: (trackId: string) => void;
  readonly onTrackSelect: (trackId: string) => void;
  readonly loading?: boolean;
  readonly previewController?: PreviewController;
}

export function MixPlanApp({
  libraryState,
  queueState,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onSetStarterTrack,
  onTrackSelect,
  loading = false,
  previewController
}: MixPlanAppProps): React.ReactElement {
  const previewObserverState = useSyncExternalStore(
    (onStoreChange) =>
      previewController?.subscribeObserver(() => onStoreChange()) ?? (() => undefined),
    () => previewController?.getObserverState() ?? null,
    () => null
  );

  // Derive selectable IDs from library state
  const selectableIds = useMemo(() => selectSelectableIds(libraryState), [libraryState]);
  
  // Derive queue IDs from queue state
  const queueIds = useMemo(() => selectQueueIds(queueState), [queueState]);
  
  // Derive starter track
  const starterTrack = useMemo(() => selectStarterTrack(queueState), [queueState]);
  const showStarterWarning = useMemo(() => {
    const starter = queueIds[0] ? libraryState.byId[queueIds[0]] : undefined;
    const adjacentTrackIds = queueIds.slice(1, 2);
    const adjacentTracks = adjacentTrackIds
      .map((trackId) => libraryState.byId[trackId])
      .filter((track): track is LibraryTrack => Boolean(track));
    return hasStarterTrackWarning(starter, adjacentTracks);
  }, [queueIds, libraryState]);

  // Keep the timeline derived from the same controlled state as the queue.
  const timeline = useMemo(
    () => selectTimeline({ queue: queueState, library: libraryState }),
    [queueState, libraryState]
  );

  // Convert library byId to array for LibraryColumn
  const libraryTracks = useMemo(() => 
    libraryState.allIds.map(id => libraryState.byId[id]).filter(Boolean) as LibraryTrack[],
    [libraryState]
  );

  // Convert library byId to record for QueueColumn
  const libraryTracksRecord = useMemo(() => libraryState.byId, [libraryState]);

  const handleTrackClick = useCallback((trackId: string) => {
    onTrackSelect(trackId);
  }, [onTrackSelect]);

  return (
    <div
      className="mixplan-app"
      data-testid="mixplan-app"
      data-timeline-point-count={timeline.length}
    >
      <header className="mixplan-header" data-testid="mixplan-header">
        <h1 data-testid="app-title">OTOMIX MixPlan</h1>
        {starterTrack && (
          <div className="starter-indicator" data-testid="starter-indicator">
            Starter: <strong>{starterTrack}</strong>
          </div>
        )}
        {showStarterWarning && (
          <div className="starter-warning" role="alert" data-testid="starter-warning">
            Starter Track warning: choose structurally distinct material.
          </div>
        )}
        {previewObserverState && <PreviewStatus state={previewObserverState} />}
      </header>
      <div className="mixplan-columns" data-testid="mixplan-columns">
        <div className="column-wrapper library-wrapper" data-testid="library-wrapper">
          <LibraryColumn
            tracks={libraryTracks}
            loading={loading}
            selectableIds={selectableIds}
            onTrackClick={handleTrackClick}
          />
        </div>
        <div className="column-wrapper queue-wrapper" data-testid="queue-wrapper">
          <QueueColumn
            queueIds={queueIds}
            libraryTracks={libraryTracksRecord}
            onAddToQueue={onAddToQueue}
            onRemoveFromQueue={onRemoveFromQueue}
            onReorderQueue={onReorderQueue}
            onSetStarterTrack={onSetStarterTrack}
          />
        </div>
      </div>
    </div>
  );
}