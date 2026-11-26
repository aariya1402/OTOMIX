// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreKickOverlay } from '../src/components/PreKickOverlay';

describe('PreKickOverlay (P08-T05-S01-M02)', () => {
  afterEach(cleanup);

  it('renders an 8-beat pre-kick segment as an amber-striped waveform zone', () => {
    render(
      <PreKickOverlay
        duration={10}
        T0={6}
        segments={[{ startBeat: -8, bpmSeed: 120 }]}
      />
    );

    const overlay = screen.getByTestId('pre-kick-overlay');
    const zones = overlay.querySelectorAll('[data-testid="pre-kick-zone"]');
    expect(zones).toHaveLength(1);
    expect(zones[0].getAttribute('data-start-beat')).toBe('-8');
    expect(zones[0].getAttribute('data-end-beat')).toBe('0');
    expect(Number(zones[0].getAttribute('x'))).toBeCloseTo(2);
    expect(Number(zones[0].getAttribute('width'))).toBeCloseTo(4);

    const fill = zones[0].getAttribute('fill');
    expect(fill).toMatch(/^url\(#pre-kick-stripes-/);
    const patternId = fill?.slice(5, -1);
    expect(overlay.querySelector(`#${patternId} path`)?.getAttribute('stroke')).toBe('#f59e0b');
  });

  it('converts variable-tempo negative beat segments into separate second-based zones', () => {
    render(
      <PreKickOverlay
        duration={10}
        T0={10}
        segments={[
          { startBeat: -16, bpmSeed: 100 },
          { startBeat: -8, bpmSeed: 110 },
        ]}
      />
    );

    const zones = screen
      .getByTestId('pre-kick-overlay')
      .querySelectorAll('[data-testid="pre-kick-zone"]');
    expect(zones).toHaveLength(2);
    expect(Number(zones[0].getAttribute('x'))).toBeCloseTo(10 - 8 * (60 / 110) - 8 * 0.6);
    expect(Number(zones[0].getAttribute('width'))).toBeCloseTo(8 * 0.6);
    expect(Number(zones[1].getAttribute('x'))).toBeCloseTo(10 - 8 * (60 / 110));
    expect(Number(zones[1].getAttribute('width'))).toBeCloseTo(8 * (60 / 110));
  });

  it('renders no zones when there is no pre-kick offset', () => {
    render(<PreKickOverlay duration={10} T0={6} segments={[]} />);

    expect(
      screen.getByTestId('pre-kick-overlay').querySelectorAll('[data-testid="pre-kick-zone"]')
    ).toHaveLength(0);
  });
});
