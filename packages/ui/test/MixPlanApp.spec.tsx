// OTOMIX §4.9 · MixPlan App Component Tests (P08-T02-S02-M01)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { MixPlanApp } from '../src/components/MixPlanApp';
import type { LibraryTrack } from '../src/state/library';
import type { LibraryState } from '../src/state/library';
import type { QueueState } from '../src/state/queue';
import { emptyLibraryState, addTracks } from '../src/state/library';
import { emptyQueueState, addToQueue, reorderQueue, setStarterTrack } from '../src/state/queue';
import { getTimelineCache, resetTimelineCache } from '../src/state/timeline';

const createTrack = (overrides: Partial<LibraryTrack> = {}): LibraryTrack => ({
  trackId: 'track-1',
  bpm: 128.0,
  camelotKey: '8A',
  energyStars: 3,
  mixability: 0.8,
  isWildcard: false,
  ...overrides
});

describe('MixPlanApp (P08-T02-S02-M01)', () => {
  const mockOnAddToQueue = vi.fn();
  const mockOnRemoveFromQueue = vi.fn();
  const mockOnReorderQueue = vi.fn();
  const mockOnSetStarterTrack = vi.fn();
  const mockOnTrackSelect = vi.fn();

  const libraryTracks = [
    createTrack({ trackId: 'track-a', bpm: 128.0, camelotKey: '8A', energyStars: 3, mixability: 0.8 }),
    createTrack({ trackId: 'track-b', bpm: 124.5, camelotKey: '9A', energyStars: 4, mixability: 0.9 }),
    createTrack({ trackId: 'track-c', bpm: 130.0, camelotKey: '7B', energyStars: 2, mixability: 0.7 }),
    createTrack({ trackId: 'track-d', bpm: 126.0, camelotKey: '8B', energyStars: 5, mixability: 0.95 }),
    createTrack({ trackId: 'track-low', bpm: 120.0, camelotKey: '1A', energyStars: 1, mixability: 0.39 }), // Below threshold
    createTrack({ trackId: 'track-wildcard', bpm: 128.0, camelotKey: '8A', energyStars: 3, mixability: 0.8, isWildcard: true })
  ];

  let libraryState: LibraryState;
  let queueState: QueueState;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Build library state
    libraryState = addTracks(emptyLibraryState(), libraryTracks);
    
    // Build queue state with track-a as starter
    queueState = setStarterTrack(emptyQueueState(), 'track-a');
    queueState = addToQueue(queueState, 'track-b');
    queueState = addToQueue(queueState, 'track-c');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders app title and two-column layout', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    expect(screen.getByTestId('app-title')).toHaveTextContent('OTOMIX MixPlan');
    expect(screen.getByTestId('mixplan-columns')).toBeInTheDocument();
    expect(screen.getByTestId('library-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('queue-wrapper')).toBeInTheDocument();
  });

  it('shows starter track indicator in header', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    expect(screen.getByTestId('starter-indicator')).toHaveTextContent('Starter: track-a');
  });

  it('shows a warning when the starter and adjacent track have the same key and neighbor-relative delta below 1%', () => {
    const warningLibraryState = addTracks(emptyLibraryState(), [
      createTrack({ trackId: 'starter', bpm: 100, camelotKey: '8A' }),
      createTrack({ trackId: 'neighbor', bpm: 101.006, camelotKey: '8A' })
    ]);
    const warningQueueState = { queueIds: ['starter', 'neighbor'] };

    render(<MixPlanApp
      libraryState={warningLibraryState}
      queueState={warningQueueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    expect(screen.getByTestId('starter-warning')).toHaveTextContent(
      'choose structurally distinct material'
    );
  });

  it('renders LibraryColumn with all tracks', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    // Library should show all 6 tracks
    expect(screen.getByTestId('library-count')).toHaveTextContent('6 tracks');
    expect(screen.getByTestId('track-row-track-a')).toBeInTheDocument();
    expect(screen.getByTestId('track-row-track-b')).toBeInTheDocument();
    expect(screen.getByTestId('track-row-track-c')).toBeInTheDocument();
    expect(screen.getByTestId('track-row-track-d')).toBeInTheDocument();
    expect(screen.getByTestId('track-row-track-low')).toBeInTheDocument();
    expect(screen.getByTestId('track-row-track-wildcard')).toBeInTheDocument();
  });

  it('renders QueueColumn with queue tracks', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    // Queue should show 3 tracks
    expect(screen.getByTestId('queue-count')).toHaveTextContent('3 tracks');
    expect(screen.getByTestId('queue-row-track-a')).toBeInTheDocument();
    expect(screen.getByTestId('queue-row-track-b')).toBeInTheDocument();
    expect(screen.getByTestId('queue-row-track-c')).toBeInTheDocument();
  });

  it('marks selectable tracks correctly (excludes low mixability and wildcards)', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    // Selectable tracks (mixability >= 0.4 and not wildcard)
    expect(screen.getByTestId('track-row-track-a')).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId('track-row-track-b')).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId('track-row-track-c')).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId('track-row-track-d')).toHaveStyle({ opacity: 1 });

    // Unmixable track (below threshold)
    expect(screen.getByTestId('track-row-track-low')).toHaveStyle({ opacity: 0.5 });

    // Wildcard track
    expect(screen.getByTestId('track-row-track-wildcard')).toHaveStyle({ opacity: 0.5 });
    expect(screen.getByTestId('wildcard-badge-track-wildcard')).toBeInTheDocument();
  });

  it('calls onTrackSelect when library track is clicked', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    fireEvent.click(screen.getByTestId('track-row-track-d'));

    expect(mockOnTrackSelect).toHaveBeenCalledWith('track-d');
  });

  it('does not call onTrackSelect for unmixable tracks', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    fireEvent.click(screen.getByTestId('track-row-track-low'));

    expect(mockOnTrackSelect).not.toHaveBeenCalled();
  });

  it('shows loading state in LibraryColumn when loading=true', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={queueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
      loading={true}
    />);

    expect(screen.getByTestId('library-count')).toHaveTextContent('Loading...');
    const skeletons = screen.getAllByTestId('skeleton-row');
    expect(skeletons).toHaveLength(5);
  });

  it('passes correct queue IDs to QueueColumn', () => {
    // Create queue with different order
    let customQueueState = setStarterTrack(emptyQueueState(), 'track-c');
    customQueueState = addToQueue(customQueueState, 'track-a');
    customQueueState = addToQueue(customQueueState, 'track-b');

    render(<MixPlanApp
      libraryState={libraryState}
      queueState={customQueueState}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    // Queue should show track-c as starter (slot 1)
    expect(screen.getByTestId('slot-1')).toHaveTextContent('1★');
    expect(screen.getByTestId('starter-badge-track-c')).toBeInTheDocument();
    expect(screen.getByTestId('slot-2')).toHaveTextContent('2');
    expect(screen.getByTestId('slot-3')).toHaveTextContent('3');
  });

  it('shows empty queue state when queue is empty', () => {
    render(<MixPlanApp
      libraryState={libraryState}
      queueState={emptyQueueState()}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
      onTrackSelect={mockOnTrackSelect}
    />);

    expect(screen.getByTestId('queue-count')).toHaveTextContent('0 tracks');
    expect(screen.getByTestId('queue-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('empty-title')).toHaveTextContent('Drop tracks here to start your mix');
  });

  it('accepts dragged library tracks from the empty state and reorders the queue', () => {
    resetTimelineCache();

    function StatefulMixPlanApp(): ReactElement {
      const [currentQueueState, setCurrentQueueState] = useState(emptyQueueState());

      return (
        <MixPlanApp
          libraryState={libraryState}
          queueState={currentQueueState}
          onAddToQueue={(trackId) => {
            mockOnAddToQueue(trackId);
            setCurrentQueueState((state) => addToQueue(state, trackId));
          }}
          onRemoveFromQueue={mockOnRemoveFromQueue}
          onReorderQueue={(fromIndex, toIndex) => {
            mockOnReorderQueue(fromIndex, toIndex);
            setCurrentQueueState((state) => reorderQueue(state, fromIndex, toIndex));
          }}
          onSetStarterTrack={mockOnSetStarterTrack}
          onTrackSelect={mockOnTrackSelect}
        />
      );
    }

    render(<StatefulMixPlanApp />);

    const dragLibraryTrack = (trackId: string, target: HTMLElement) => {
      const dataTransfer = new DataTransfer();
      fireEvent.dragStart(
        screen.getByTestId(`track-row-${trackId}`),
        new DragEvent('dragstart', { dataTransfer })
      );
      fireEvent.drop(target, new DragEvent('drop', { dataTransfer }));
    };

    dragLibraryTrack('track-a', screen.getByTestId('queue-empty-state'));
    expect(mockOnAddToQueue).toHaveBeenLastCalledWith('track-a');
    expect(screen.queryByTestId('queue-empty-state')).not.toBeInTheDocument();
    expect(getTimelineCache().queueIds).toEqual(['track-a']);
    expect(screen.getByTestId('mixplan-app')).toHaveAttribute(
      'data-timeline-point-count',
      String(getTimelineCache().result.length)
    );

    for (const trackId of ['track-b', 'track-c']) {
      dragLibraryTrack(trackId, screen.getByTestId('queue-rows'));
      expect(mockOnAddToQueue).toHaveBeenLastCalledWith(trackId);
    }
    expect(getTimelineCache().queueIds).toEqual(['track-a', 'track-b', 'track-c']);
    expect(getTimelineCache().result.map((point) => point.trackId)).toEqual(
      expect.arrayContaining(['track-a', 'track-b', 'track-c'])
    );

    const queueTrackB = screen.getByTestId('queue-row-track-b');
    const timelineBeforeReorder = getTimelineCache().result;
    const reorderDataTransfer = new DataTransfer();
    fireEvent.dragStart(queueTrackB, new DragEvent('dragstart', { dataTransfer: reorderDataTransfer }));
    fireEvent.drop(
      screen.getByTestId('queue-row-track-c'),
      new DragEvent('drop', { dataTransfer: reorderDataTransfer })
    );

    expect(mockOnReorderQueue).toHaveBeenCalledWith(1, 2);
    expect(getTimelineCache().queueIds).toEqual(['track-a', 'track-c', 'track-b']);
    expect(getTimelineCache().result).not.toBe(timelineBeforeReorder);
    expect(screen.getAllByTestId(/^queue-row-/).map((row) => row.getAttribute('data-testid'))).toEqual([
      'queue-row-track-a',
      'queue-row-track-c',
      'queue-row-track-b'
    ]);
  });
});
