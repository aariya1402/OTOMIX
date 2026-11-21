// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryColumn } from '../src/components/LibraryColumn';

describe('P08-T02-S01-M01 LibraryColumn', () => {
  it('shows skeletons while loading and attributes after loading', () => {
    const { rerender } = render(<LibraryColumn rows={[]} loading />);
    expect(screen.getAllByRole('status')).toHaveLength(3);

    rerender(<LibraryColumn rows={[{
      track_id: 'a',
      bpm: 120,
      camelot_key: '8A',
      energy_stars: 3,
      mixability: 0.8,
    }]} />);
    expect(screen.getByLabelText(/BPM 120/)).toBeTruthy();
  });
});
