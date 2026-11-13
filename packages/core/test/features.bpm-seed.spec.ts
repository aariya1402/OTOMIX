import { describe, it, expect } from 'vitest';
import { deriveBpmSeed } from '../src/features/bpm-seed';

describe('BPM Seed Derivation (P05-T02-S01-M01)', () => {
  it('T1: bimodal histogram (60 and 120) with peak at 120 -> returns 120', () => {
    const histogram = [
      { bpm: 60, weight: 10 },
      { bpm: 120, weight: 20 }
    ];
    const peak = { bpm: 120, strength: 0.9 };
    const result = deriveBpmSeed(histogram, peak);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(120);
  });

  it('T2: unimodal histogram -> returns that BPM', () => {
    const histogram = [{ bpm: 128, weight: 50 }];
    const peak = { bpm: 128, strength: 0.8 };
    const result = deriveBpmSeed(histogram, peak);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(128);
  });

  it('T3: strong peak contradicts cluster -> rejected', () => {
    // Cluster at 60 (weight 50) vs 120 (weight 10). Winner is 60.
    // Strong peak at 120 (strength 0.9). Tolerance is 10.
    const histogram = [
      { bpm: 60, weight: 50 },
      { bpm: 120, weight: 10 }
    ];
    const peak = { bpm: 120, strength: 0.9 };
    const result = deriveBpmSeed(histogram, peak);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_ARGUMENT');
  });

  it('T4: empty histogram -> returns INVALID_ARGUMENT', () => {
    const result = deriveBpmSeed([], { bpm: 120, strength: 0.5 });
    expect(result.ok).toBe(false);
  });

  it('T5: weak peak does not override clear winner', () => {
    const histogram = [{ bpm: 128, weight: 50 }];
    const peak = { bpm: 60, strength: 0.2 }; // weak peak
    const result = deriveBpmSeed(histogram, peak);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(128);
  });
});