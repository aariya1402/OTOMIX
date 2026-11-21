// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueueColumn } from '../src/components/QueueColumn';

describe('P08-T02-S01-M02 QueueColumn', () => {
  it('shows an explicit empty state and handles drop/reorder callbacks', () => {
    const onDropTrack = vi.fn();
    const { rerender } = render(<QueueColumn queue={[]} onDropTrack={onDropTrack} />);
    expect(screen.getByText('Queue is empty')).toBeTruthy();

    rerender(<QueueColumn queue={['C', 'A']} onDropTrack={onDropTrack} />);
    const target = screen.getByText('2. A').parentElement;
    if (!target) throw new Error('queue target missing');
    fireEvent.drop(target, {
      dataTransfer: { getData: () => 'B' },
    });
    expect(onDropTrack).toHaveBeenCalledWith('B', 1);
  });
});
