import { describe, it, expect } from 'vitest';
import { computeStars } from '../src/features/stars';
import { getAnalysisConfig } from '../src/config/analysis';

describe('computeStars (P05-T02-S02-M04)', () => {
  const cfg = getAnalysisConfig().energy.stars;

  it('T1: raw=0.1 -> 1 star', () => {
    expect(computeStars(0.1, cfg)).toBe(1);
  });

  it('T2: raw=0.5 -> 3 stars', () => {
    expect(computeStars(0.5, cfg)).toBe(3);
  });

  it('T3: raw=0.9 -> 5 stars', () => {
    expect(computeStars(0.9, cfg)).toBe(5);
  });

  it('T4: raw=0.8 (boundary) -> 5 stars', () => {
    expect(computeStars(0.8, cfg)).toBe(5);
  });

  it('clamps out-of-range raw to 1 star', () => {
    expect(computeStars(-0.5, cfg)).toBe(1);
    expect(computeStars(1.5, cfg)).toBe(1);
  });
});