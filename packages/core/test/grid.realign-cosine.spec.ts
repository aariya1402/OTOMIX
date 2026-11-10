// OTOMIX §3.2 · Mother §2.2
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { cosineRealign } from '../src/grid/realign-cosine';
import { REALIGN_BEATS } from '../src/constants/grid';

describe('cosineRealign (P03-T03-S01-M02)', () => {
  const DELTA_PHI = 16; // ms

  it('starts at 0 ms correction at beat 0', () => {
    expect(cosineRealign(0, DELTA_PHI)).toBeCloseTo(0, 6);
  });

  it('ends at Δφ (16 ms) at beat 16', () => {
    expect(cosineRealign(REALIGN_BEATS, DELTA_PHI)).toBeCloseTo(DELTA_PHI, 6);
  });

  it('is monotonic across all beats 0..16', () => {
    let prev = -Infinity;
    for (let n = 0; n <= REALIGN_BEATS; n++) {
      const curr = cosineRealign(n, DELTA_PHI);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('mean slope is approximately 1 ms/beat', () => {
    const totalCorrection = cosineRealign(REALIGN_BEATS, DELTA_PHI) - cosineRealign(0, DELTA_PHI);
    const meanSlope = totalCorrection / REALIGN_BEATS;
    expect(meanSlope).toBeCloseTo(1, 1);
  });

  it('intermediate values follow cosine shape (spot checks)', () => {
    expect(cosineRealign(8, DELTA_PHI)).toBeCloseTo(8, 6);
    expect(cosineRealign(4, DELTA_PHI)).toBeCloseTo(16 * (1 - Math.cos(Math.PI / 4)) * 0.5, 6);
    expect(cosineRealign(12, DELTA_PHI)).toBeCloseTo(16 * (1 - Math.cos(3 * Math.PI / 4)) * 0.5, 6);
  });

  it('clamps beatOffset outside [0, 16] range', () => {
    expect(cosineRealign(-5, DELTA_PHI)).toBeCloseTo(0, 6);
    expect(cosineRealign(100, DELTA_PHI)).toBeCloseTo(DELTA_PHI, 6);
  });

  it('implementation is pure arithmetic with no allocations', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/realign-cosine.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
  });
});