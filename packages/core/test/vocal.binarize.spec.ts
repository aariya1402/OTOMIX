import { describe, it, expect } from 'vitest';
import { binarizeVocalMap } from '../src/vocal/binarize';

describe('Vocal Binarization (P05-T03-S01-M01)', () => {
  it('T1: strict comparison > 0.65', () => {
    const probs = [0.64, 0.65, 0.651];
    const result = binarizeVocalMap(probs, 0.65);
    expect(result).toEqual([0, 0, 1]);
  });

  it('T2: default threshold is 0.65', () => {
    const probs = [0.65, 0.66, 0.5];
    const result = binarizeVocalMap(probs);
    expect(result).toEqual([0, 1, 0]);
  });

  it('T3: empty array returns empty array', () => {
    expect(binarizeVocalMap([])).toEqual([]);
  });
});