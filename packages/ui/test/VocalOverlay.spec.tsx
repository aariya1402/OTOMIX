// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VocalOverlay, type VocalOverlayFrame } from '../src/components/VocalOverlay';

const frame = (t: number, p: number, v: 0 | 1 = p > 0.65 ? 1 : 0): VocalOverlayFrame => ({
  t,
  p,
  v,
});

describe('VocalOverlay (P08-T05-S01-M01)', () => {
  afterEach(cleanup);

  it('renders consecutive vocal frames as red-striped SVG zones', () => {
    render(
      <VocalOverlay
        duration={8}
        frames={[
          frame(0, 0.1),
          frame(1, 0.8),
          frame(2, 0.9),
          frame(3, 0.2),
          frame(4, 0.7),
          frame(5, 0.9),
          frame(6, 0.2),
          frame(7, 0.1),
        ]}
      />
    );

    const zones = screen
      .getByTestId('vocal-overlay')
      .querySelectorAll('[data-testid="vocal-zone"]');
    expect(zones).toHaveLength(2);
    expect(zones[0]?.getAttribute('x')).toBe('1');
    expect(zones[0]?.getAttribute('width')).toBe('2');
    expect(zones[1]?.getAttribute('x')).toBe('4');
    expect(zones[1]?.getAttribute('width')).toBe('2');

    const fill = zones[0].getAttribute('fill');
    expect(fill).toMatch(/^url\(#vocal-stripes-/);
    const patternId = fill?.slice(5, -1);
    expect(
      screen
        .getByTestId('vocal-overlay')
        .querySelector(`#${patternId} path`)
        ?.getAttribute('stroke')
    ).toBe('#dc2626');
  });

  it('renders no zones for instrumental frames, including a vocal probability suppressed by the binary map', () => {
    render(
      <VocalOverlay
        duration={4}
        frames={[frame(0, 0.2), frame(1, 0.65), frame(2, 0.9, 0), frame(3, 0.1)]}
      />
    );

    expect(
      screen.getByTestId('vocal-overlay').querySelectorAll('[data-testid="vocal-zone"]')
    ).toHaveLength(0);
  });

  it('uses a distinct stripe pattern for each overlay instance', () => {
    const { container } = render(
      <>
        <VocalOverlay duration={1} frames={[frame(0, 0.9)]} />
        <VocalOverlay duration={1} frames={[frame(0, 0.9)]} />
      </>
    );

    const patternIds = Array.from(container.querySelectorAll('pattern')).map((pattern) =>
      pattern.getAttribute('id')
    );
    expect(new Set(patternIds).size).toBe(2);
  });
});
