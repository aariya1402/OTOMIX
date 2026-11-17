// P03-T06-S01-M06 - OQ-02 decision record
// Decision source: Docs/.Agents/AI Agent.MD#L417-425 (transition window = 16 bars = 64 beats)

import { describe, it, expect } from 'vitest';
import {
  TRANSITION_WINDOW_BARS,
  TRANSITION_WINDOW_BEATS,
} from '../src/constants/grid';

describe('P03-T06-S01-M06 - OQ-02 decision (transition window size)', () => {
  it('TRANSITION_WINDOW_BARS is 16 (bars)', () => {
    expect(TRANSITION_WINDOW_BARS).toBe(16);
  });

  it('TRANSITION_WINDOW_BEATS is 64 (beats)', () => {
    expect(TRANSITION_WINDOW_BEATS).toBe(64);
  });

  it('TRANSITION_WINDOW_BEATS === TRANSITION_WINDOW_BARS * 4 (BEATS_PER_BAR)', () => {
    expect(TRANSITION_WINDOW_BEATS).toBe(TRANSITION_WINDOW_BARS * 4);
  });
});