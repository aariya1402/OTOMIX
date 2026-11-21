// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocalOverlay, getVocalRegions } from '../src/components/VocalOverlay';

describe('P08-T05-S01-M01 VocalOverlay', () => {
  it('renders two vocal zone rects and none for instrumental maps', () => {
    const map = [0.1, 0.1, 0.8, 0.9, 0.1, 0.7, 0.8];
    expect(getVocalRegions(map)).toHaveLength(2);
    const { rerender } = render(<VocalOverlay vocalMap={map} />);
    expect(screen.getAllByTestId(/vocal-zone-/)).toHaveLength(2);

    rerender(<VocalOverlay vocalMap={[0.1, 0.2, 0.3]} />);
    expect(screen.queryByTestId(/vocal-zone-/)).toBeNull();
  });
});
