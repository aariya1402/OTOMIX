// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreKickOverlay } from '../src/components/PreKickOverlay';

describe('P08-T05-S01-M02 PreKickOverlay', () => {
  it('renders one warning for positive offset and none for zero', () => {
    const { rerender } = render(<PreKickOverlay preKickBeats={8} />);
    expect(screen.getByTestId('prekick-overlay')).toBeTruthy();

    rerender(<PreKickOverlay preKickBeats={0} />);
    expect(screen.queryByTestId('prekick-overlay')).toBeNull();
  });
});
