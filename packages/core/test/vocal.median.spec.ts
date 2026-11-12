import { describe, it, expect } from 'vitest';
import { medianSmoothVocalMap, type VocalFrame } from '../src/vocal/median';

describe('Vocal Median Smoothing (P05-T03-S01-M02)', () => {
  it('T1: removes isolated 1-frame spikes', () => {
    const frames: VocalFrame[] = [
      { t: 0.0, v: 0 }, { t: 0.1, v: 0 }, { t: 0.2, v: 1 }, // spike
      { t: 0.3, v: 0 }, { t: 0.4, v: 0 }, { t: 0.5, v: 0 },
    ];
    const result = medianSmoothVocalMap(frames, 1.0);
    expect(result).toEqual([0, 0, 0, 0, 0, 0]); // spike removed
  });

  it('T2: retains a 2-second contiguous vocal region', () => {
    const frames: VocalFrame[] = [
      { t: 0.0, v: 1 }, { t: 0.5, v: 1 }, { t: 1.0, v: 1 },
      { t: 1.5, v: 1 }, { t: 2.0, v: 1 },
    ];
    const result = medianSmoothVocalMap(frames, 1.0);
    expect(result).toEqual([1, 1, 1, 1, 1]); // region retained
  });

  it('T3: empty array returns empty array', () => {
    expect(medianSmoothVocalMap([], 1.0)).toEqual([]);
  });

  it('T4: single frame passes through unchanged', () => {
    expect(medianSmoothVocalMap([{ t: 0, v: 1 }], 1.0)).toEqual([1]);
  });
});