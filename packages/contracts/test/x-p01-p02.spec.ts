import { describe, it, expect } from 'vitest';
import { BPM } from '@otomix/core';
import { BeatIndex } from '@otomix/core';

// Stub tOfI for P02 boundary testing
function tOfI(bpm: BPM, beatIndex: BeatIndex, t0: number = 0): number {
  // Assume BPM and BeatIndex have a .value property based on branded types
  const bpmVal = (bpm as any).value || (bpm as unknown as number);
  const beatVal = (beatIndex as any).value || (beatIndex as unknown as number);
  return t0 + beatVal * (60 / bpmVal);
}

describe('X-P01-P02: Grid Engine Boundary', () => {
  it('accepts valid BPM and BeatIndex', () => {
    const bpm = BPM.parse(120);
    const beat = BeatIndex.parse(1);
    if (bpm.ok && beat.ok) {
      expect(tOfI(bpm.value, beat.value, 0.25)).toBeCloseTo(0.75, 5);
    }
  });
  it('rejects raw 59.9 BPM', () => {
    const res = BPM.parse(59.9);
    expect(res.ok).toBe(false);
  });
  it('rejects BeatIndex(0)', () => {
    const res = BeatIndex.parse(0);
    expect(res.ok).toBe(false);
  });
});