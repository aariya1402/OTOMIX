// OTOMIX §4.9 · Library Column Component Tests (P08-T02-S01-M01)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LibraryColumn } from '../src/components/LibraryColumn';
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

describe('LibraryColumn (P08-T02-S01-M01)', () => {
  const mockOnTrackClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders skeleton placeholders when loading=true', () => {
    render(<LibraryColumn tracks={[]} loading={true} selectableIds={[]} onTrackClick={mockOnTrackClick} />);

    expect(screen.getByTestId('library-title')).toHaveTextContent('Library');
    expect(screen.getByTestId('library-count')).toHaveTextContent('Loading...');

    const skeletons = screen.getAllByTestId('skeleton-row');
    expect(skeletons).toHaveLength(5);
  });

  it('renders 3 loaded rows with all four attributes when loading=false', () => {
    const tracks = [
      createTrack({ trackId: 'track-a', bpm: 128.0, camelotKey: '8A', energyStars: 3, mixability: 0.8 }),
      createTrack({ trackId: 'track-b', bpm: 124.5, camelotKey: '9A', energyStars: 4, mixability: 0.9 }),
      createTrack({ trackId: 'track-c', bpm: 130.0, camelotKey: '7B', energyStars: 2, mixability: 0.7 })
    ];

    render(<LibraryColumn tracks={tracks} loading={false} selectableIds={['track-a', 'track-b', 'track-c']} onTrackClick={mockOnTrackClick} />);

    expect(screen.getByTestId('library-title')).toHaveTextContent('Library');
    expect(screen.getByTestId('library-count')).toHaveTextContent('3 tracks');

    // Check track-a
    expect(screen.getByTestId('bpm-track-a')).toHaveTextContent('128.0 BPM');
    expect(screen.getByTestId('key-track-a')).toHaveTextContent('8A');
    expect(screen.getByTestId('energy-track-a')).toHaveTextContent('★★★☆☆');
    expect(screen.getByTestId('mixability-track-a')).toHaveTextContent('80%');

    // Check track-b
    expect(screen.getByTestId('bpm-track-b')).toHaveTextContent('124.5 BPM');
    expect(screen.getByTestId('key-track-b')).toHaveTextContent('9A');
    expect(screen.getByTestId('energy-track-b')).toHaveTextContent('★★★★☆');
    expect(screen.getByTestId('mixability-track-b')).toHaveTextContent('90%');

    // Check track-c
    expect(screen.getByTestId('bpm-track-c')).toHaveTextContent('130.0 BPM');
    expect(screen.getByTestId('key-track-c')).toHaveTextContent('7B');
    expect(screen.getByTestId('energy-track-c')).toHaveTextContent('★★☆☆☆');
    expect(screen.getByTestId('mixability-track-c')).toHaveTextContent('70%');
  });

  it('shows empty state when no tracks and not loading', () => {
    render(<LibraryColumn tracks={[]} loading={false} selectableIds={[]} onTrackClick={mockOnTrackClick} />);

    expect(screen.getByTestId('library-empty')).toHaveTextContent('No tracks in library');
  });

  it('marks unmixable tracks (below threshold) with reduced opacity', () => {
    const tracks = [
      createTrack({ trackId: 'selectable', mixability: 0.5 }),
      createTrack({ trackId: 'unmixable', mixability: 0.39 })
    ];

    render(<LibraryColumn tracks={tracks} loading={false} selectableIds={['selectable']} onTrackClick={mockOnTrackClick} />);

    const selectableRow = screen.getByTestId('track-row-selectable');
    const unmixableRow = screen.getByTestId('track-row-unmixable');

    expect(selectableRow).toHaveStyle({ opacity: 1 });
    expect(unmixableRow).toHaveStyle({ opacity: 0.5 });
  });

  it('shows wildcard badge for wildcard tracks', () => {
    const tracks = [
      createTrack({ trackId: 'normal', isWildcard: false }),
      createTrack({ trackId: 'wildcard', isWildcard: true })
    ];

    render(<LibraryColumn tracks={tracks} loading={false} selectableIds={['normal', 'wildcard']} onTrackClick={mockOnTrackClick} />);

    expect(screen.getByTestId('wildcard-badge-wildcard')).toHaveTextContent('Wildcard');
    expect(screen.queryByTestId('wildcard-badge-normal')).not.toBeInTheDocument();
  });

  it('calls onTrackClick when a track row is clicked', () => {
    const tracks = [createTrack({ trackId: 'track-a' })];

    render(<LibraryColumn tracks={tracks} loading={false} selectableIds={['track-a']} onTrackClick={mockOnTrackClick} />);

    fireEvent.click(screen.getByTestId('track-row-track-a'));

    expect(mockOnTrackClick).toHaveBeenCalledWith('track-a');
  });

  it('does not call onTrackClick for unmixable tracks when clicked', () => {
    const tracks = [
      createTrack({ trackId: 'selectable', mixability: 0.5 }),
      createTrack({ trackId: 'unmixable', mixability: 0.39 })
    ];

    render(<LibraryColumn tracks={tracks} loading={false} selectableIds={['selectable']} onTrackClick={mockOnTrackClick} />);

    fireEvent.click(screen.getByTestId('track-row-unmixable'));

    expect(mockOnTrackClick).not.toHaveBeenCalled();
  });
});