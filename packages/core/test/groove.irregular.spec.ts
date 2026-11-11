// OTOMIX §3.5 · Mother §2.5
import { describe, it, expect } from 'vitest';
import { resolveGrooveMode, extendCrossfadeForIrregular } from '../src/groove/irregular';
import { classifyGroove } from '../src/groove/classify';

// Fixture that produces 'Irregular' (no mode matches)
const irregularFixture = {
  deviations: [
    0.03, -0.04, 0.05, -0.02,
    0.01, 0.08, -0.03, 0.04,
    0.05, -0.06, 0.07, -0.04,
    0.02, 0.09, -0.01, 0.03,
  ],
};

describe('resolveGrooveMode (P03-T05-S01-M03)', () => {
  it('returns Straight for Irregular input', () => {
    expect(resolveGrooveMode('Irregular')).toBe('Straight');
  });

  it('returns mode unchanged for Straight', () => {
    expect(resolveGrooveMode('Straight')).toBe('Straight');
  });

  it('returns mode unchanged for Triplet', () => {
    expect(resolveGrooveMode('Triplet')).toBe('Triplet');
  });

  it('returns mode unchanged for Swing', () => {
    expect(resolveGrooveMode('Swing')).toBe('Swing');
  });

  it('integrates with classifyGroove: Irregular fixture resolves to Straight', () => {
    const result = classifyGroove(irregularFixture);
    expect(result.mode).toBe('Irregular');
    expect(resolveGrooveMode(result.mode)).toBe('Straight');
  });
});

describe('extendCrossfadeForIrregular (P03-T05-S01-M03)', () => {
  it('adds 10 ms for Irregular mode with base 5 ms', () => {
    expect(extendCrossfadeForIrregular(5, 'Irregular')).toBe(5.48);
  });

  it('returns base unchanged for Straight', () => {
    expect(extendCrossfadeForIrregular(5, 'Straight')).toBe(5);
  });

  it('returns base unchanged for Triplet', () => {
    expect(extendCrossfadeForIrregular(5, 'Triplet')).toBe(5);
  });

  it('returns base unchanged for Swing', () => {
    expect(extendCrossfadeForIrregular(5, 'Swing')).toBe(5);
  });

  it('uses IRREGULAR_XFADE_EXTRA_MS constant (not a literal)', () => {
    expect(extendCrossfadeForIrregular(0, 'Irregular')).toBe(0.48);
    expect(extendCrossfadeForIrregular(100, 'Irregular')).toBe(100.48);
  });

  it('spec scenario: irregular fixture with base 5ms → Straight + 15ms', () => {
    const result = classifyGroove(irregularFixture);
    const mode = resolveGrooveMode(result.mode);
    const crossfade = extendCrossfadeForIrregular(5, result.mode);
    expect(mode).toBe('Straight');
    expect(crossfade).toBe(5.48);
  });
});