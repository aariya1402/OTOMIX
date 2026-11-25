// OTOMIX §4.9 · Queue Column Component Tests (P08-T02-S01-M02)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueueColumn } from '../src/components/QueueColumn';
import type { LibraryTrack } from '../src/state/library';

const createTrack = (overrides: Partial<LibraryTrack> = {}): LibraryTrack => ({
  trackId: 'track-1',
  bpm: 128.0,
  camelotKey: '8A',
  energyStars: 3,
  mixability: 0.8,
  isWildcard: false,
  ...overrides
});

describe('QueueColumn (P08-T02-S01-M02)', () => {
  const mockOnAddToQueue = vi.fn();
  const mockOnRemoveFromQueue = vi.fn();
  const mockOnReorderQueue = vi.fn();
  const mockOnSetStarterTrack = vi.fn();

  const libraryTracks = {
    'track-a': createTrack({ trackId: 'track-a', bpm: 128.0, camelotKey: '8A', energyStars: 3, mixability: 0.8 }),
    'track-b': createTrack({ trackId: 'track-b', bpm: 124.5, camelotKey: '9A', energyStars: 4, mixability: 0.9 }),
    'track-c': createTrack({ trackId: 'track-c', bpm: 130.0, camelotKey: '7B', energyStars: 2, mixability: 0.7 }),
    'track-d': createTrack({ trackId: 'track-d', bpm: 126.0, camelotKey: '8B', energyStars: 5, mixability: 0.95 })
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders empty state with drop zone when queue is empty', () => {
    render(<QueueColumn
      queueIds={[]}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    expect(screen.getByTestId('queue-title')).toHaveTextContent('Queue');
    expect(screen.getByTestId('queue-count')).toHaveTextContent('0 tracks');
    expect(screen.getByTestId('queue-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('empty-title')).toHaveTextContent('Drop tracks here to start your mix');
    expect(screen.getByTestId('empty-subtitle')).toHaveTextContent('Drag tracks from the library to build your queue');
  });

  it('renders queue with tracks when not empty', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    expect(screen.getByTestId('queue-count')).toHaveTextContent('2 tracks');
    expect(screen.getByTestId('queue-row-track-a')).toBeInTheDocument();
    expect(screen.getByTestId('queue-row-track-b')).toBeInTheDocument();
    expect(screen.queryByTestId('queue-empty-state')).not.toBeInTheDocument();
  });

  it('shows starter badge on slot 1 (index 0)', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    expect(screen.getByTestId('slot-1')).toHaveTextContent('1★');
    expect(screen.getByTestId('starter-badge-track-a')).toBeInTheDocument();
    expect(screen.getByTestId('slot-2')).toHaveTextContent('2');
    expect(screen.queryByTestId('starter-badge-track-b')).not.toBeInTheDocument();
  });

  it('shows track info (BPM, Key, Energy, Mixability) for each row', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    // Track A
    expect(screen.getByTestId('queue-bpm-track-a')).toHaveTextContent('128.0 BPM');
    expect(screen.getByTestId('queue-key-track-a')).toHaveTextContent('8A');
    expect(screen.getByTestId('queue-energy-track-a')).toHaveTextContent('★★★☆☆');
    expect(screen.getByTestId('queue-mixability-track-a')).toHaveTextContent('80%');

    // Track B
    expect(screen.getByTestId('queue-bpm-track-b')).toHaveTextContent('124.5 BPM');
    expect(screen.getByTestId('queue-key-track-b')).toHaveTextContent('9A');
    expect(screen.getByTestId('queue-energy-track-b')).toHaveTextContent('★★★★☆');
    expect(screen.getByTestId('queue-mixability-track-b')).toHaveTextContent('90%');
  });

  it('shows lock icon for starter track and action buttons for others', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    // Starter track (track-a) shows lock
    expect(screen.getByTestId('starter-locked-track-a')).toBeInTheDocument();
    expect(screen.queryByTestId('set-starter-track-a')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-track-a')).not.toBeInTheDocument();

    // Non-starter track (track-b) shows action buttons
    expect(screen.getByTestId('set-starter-track-b')).toBeInTheDocument();
    expect(screen.getByTestId('remove-track-b')).toBeInTheDocument();
    expect(screen.queryByTestId('starter-locked-track-b')).not.toBeInTheDocument();
  });

  it('calls onRemoveFromQueue when remove button is clicked', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    fireEvent.click(screen.getByTestId('remove-track-b'));

    expect(mockOnRemoveFromQueue).toHaveBeenCalledWith('track-b');
    expect(mockOnRemoveFromQueue).toHaveBeenCalledTimes(1);
  });

  it('calls onSetStarterTrack when set starter button is clicked', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    fireEvent.click(screen.getByTestId('set-starter-track-b'));

    expect(mockOnSetStarterTrack).toHaveBeenCalledWith('track-b');
    expect(mockOnSetStarterTrack).toHaveBeenCalledTimes(1);
  });

  it('calls onAddToQueue when track is dropped from library', () => {
    render(<QueueColumn
      queueIds={['track-a']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    dropEvent.dataTransfer.setData('text/plain', 'track-b');

    fireEvent.drop(screen.getByTestId('queue-rows'), dropEvent);

    expect(mockOnAddToQueue).toHaveBeenCalledWith('track-b');
  });

  it('does not add duplicate tracks when dropped', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    dropEvent.dataTransfer.setData('text/plain', 'track-a'); // Already in queue

    fireEvent.drop(screen.getByTestId('queue-rows'), dropEvent);

    expect(mockOnAddToQueue).not.toHaveBeenCalled();
  });

  it('calls onReorderQueue when track is dragged and dropped to new position', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b', 'track-c']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    // Simulate drag start on track-b (index 1)
    const dragStartEvent = new DragEvent('dragstart', {
      dataTransfer: new DataTransfer()
    });
    dragStartEvent.dataTransfer.setData('text/plain', 'track-b');
    fireEvent.dragStart(screen.getByTestId('queue-row-track-b'), dragStartEvent);

    // Simulate drop on track-c position (index 2)
    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    dropEvent.dataTransfer.setData('text/plain', 'track-b');
    fireEvent.drop(screen.getByTestId('queue-row-track-c'), dropEvent);

    expect(mockOnReorderQueue).toHaveBeenCalledWith(1, 2);
  });

  it('does not allow reordering starter track (index 0)', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b', 'track-c']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    // Try to drag starter track (track-a at index 0)
    const dragStartEvent = new DragEvent('dragstart', {
      dataTransfer: new DataTransfer()
    });
    dragStartEvent.dataTransfer.setData('text/plain', 'track-a');
    fireEvent.dragStart(screen.getByTestId('queue-row-track-a'), dragStartEvent);

    // Try to drop at index 1
    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    dropEvent.dataTransfer.setData('text/plain', 'track-a');
    fireEvent.drop(screen.getByTestId('queue-row-track-b'), dropEvent);

    expect(mockOnReorderQueue).not.toHaveBeenCalled();
  });

  it('does not allow dropping onto starter track position (index 0)', () => {
    render(<QueueColumn
      queueIds={['track-a', 'track-b', 'track-c']}
      libraryTracks={libraryTracks}
      onAddToQueue={mockOnAddToQueue}
      onRemoveFromQueue={mockOnRemoveFromQueue}
      onReorderQueue={mockOnReorderQueue}
      onSetStarterTrack={mockOnSetStarterTrack}
    />);

    // Drag track-b (index 1)
    const dragStartEvent = new DragEvent('dragstart', {
      dataTransfer: new DataTransfer()
    });
    dragStartEvent.dataTransfer.setData('text/plain', 'track-b');
    fireEvent.dragStart(screen.getByTestId('queue-row-track-b'), dragStartEvent);

    // Try to drop onto starter track (track-a at index 0)
    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    dropEvent.dataTransfer.setData('text/plain', 'track-b');
    fireEvent.drop(screen.getByTestId('queue-row-track-a'), dropEvent);

    expect(mockOnReorderQueue).not.toHaveBeenCalled();
  });
});