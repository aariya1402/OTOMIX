import { describe, it, expect } from 'vitest';
import { isBpmDynamic } from '../src/features/bpm-seed';

describe('isBpmDynamic (P05-T02-S01-M02)', () => {
  it('returns false for a static BPM histogram', () => {
    const hist = [
      { bpm: 120, weight: 1 },
      { bpm: 120.5, weight: 2 },
      { bpm: 120.1, weight: 1 }
    ];
    expect(isBpmDynamic(hist)).toBe(false);
  });

  it('returns true for a dynamic BPM histogram', () => {
    const hist = [
      { bpm: 120, weight: 1 },
      { bpm: 125, weight: 2 },
      { bpm: 118, weight: 1 }
    ];
    expect(isBpmDynamic(hist)).toBe(true);
  });

  it('returns false for an empty histogram', () => {
    expect(isBpmDynamic([])).toBe(false);
  });
});