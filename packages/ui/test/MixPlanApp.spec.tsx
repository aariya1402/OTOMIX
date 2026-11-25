// OTOMIX §4.9 · MixPlan App Component Tests (P08-T02-S02-M01)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MixPlanApp } from '../src/components/MixPlanApp';
import type { LibraryTrack } from '../src/state/library';
import type { LibraryState } from '../src/state/library';
import type { QueueState } from '../src/state/queue';
import { emptyLibraryState, addTracks } from '../src/state/library';
import { emptyQueueState, addToQueue, setStarterTrack } from '../src/state/queue';

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
});