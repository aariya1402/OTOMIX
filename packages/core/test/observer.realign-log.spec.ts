// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { logRealign, OBSERVER_REALIGN_BEATS } from '../src/observer/realign-log';
import { REALIGN_MAX_SEMITONES, STATIC_GRID_BPM } from '../src/constants/grid';

describe('logRealign (P03-T03-S01-M04)', () => {
  const DELTA_PHI = 40; // ms
  const BEAT_DURATION_S = 60 / STATIC_GRID_BPM; // 0.5 s at 120 BPM

  it('starts at 0 ms correction at beat 0', () => {
    expect(logRealign(0, DELTA_PHI)).toBeCloseTo(0, 6);
  });

  it('ends at Δφ (40 ms) at beat 64', () => {
    expect(logRealign(OBSERVER_REALIGN_BEATS, DELTA_PHI)).toBeCloseTo(DELTA_PHI, 6);
  });

  it('is monotonic across all beats 0..64', () => {
    let prev = -Infinity;
    for (let n = 0; n <= OBSERVER_REALIGN_BEATS; n++) {
      const curr = logRealign(n, DELTA_PHI);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('max instantaneous rate deviation induces <0.05 semitones (computed from samples)', () => {
    let maxSlopeMsPerBeat = 0;
    for (let n = 0; n < OBSERVER_REALIGN_BEATS; n++) {
      const curr = logRealign(n, DELTA_PHI);
      const next = logRealign(n + 1, DELTA_PHI);
      const slope = next - curr;
      if (slope > maxSlopeMsPerBeat) maxSlopeMsPerBeat = slope;
    }
    const maxRateDeviation = (maxSlopeMsPerBeat / 1000) / BEAT_DURATION_S;
    const maxPitchShiftSemitones = 12 * Math.log2(1 + maxRateDeviation);
    expect(maxPitchShiftSemitones).toBeLessThan(REALIGN_MAX_SEMITONES);
  });

  it('intermediate values follow logarithmic shape (spot checks)', () => {
    const k = 3;
    const expectedAt32 = DELTA_PHI * Math.log1p(k * 0.5) / Math.log1p(k);
    const expectedAt16 = DELTA_PHI * Math.log1p(k * 0.25) / Math.log1p(k);
    const expectedAt48 = DELTA_PHI * Math.log1p(k * 0.75) / Math.log1p(k);
    expect(logRealign(32, DELTA_PHI)).toBeCloseTo(expectedAt32, 6);
    expect(logRealign(16, DELTA_PHI)).toBeCloseTo(expectedAt16, 6);
    expect(logRealign(48, DELTA_PHI)).toBeCloseTo(expectedAt48, 6);
  });

  it('clamps beatOffset outside [0, 64] range', () => {
    expect(logRealign(-10, DELTA_PHI)).toBeCloseTo(0, 6);
    expect(logRealign(100, DELTA_PHI)).toBeCloseTo(DELTA_PHI, 6);
  });

  it('implementation is pure arithmetic with no allocations', () => {
    const srcPath = path.resolve(__dirname, '../src/observer/realign-log.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
  });
});