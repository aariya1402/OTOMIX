// OTOMIX §3.2 · Mother §2.2
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { phaseOffset } from '../src/grid/phase-offset';

describe('phaseOffset', () => {
  it('returns positive Δφ when body peak follows attack onset', () => {
    expect(phaseOffset(0.512, 0.500)).toBeCloseTo(0.012, 9);
  });

  it('returns negative Δφ when body peak precedes attack onset', () => {
    expect(phaseOffset(0.500, 0.512)).toBeCloseTo(-0.012, 9);
  });

  it('returns zero when perfectly aligned', () => {
    expect(phaseOffset(0.500, 0.500)).toBeCloseTo(0.0, 9);
  });

  it('handles large positive offset', () => {
    expect(phaseOffset(1.000, 0.000)).toBeCloseTo(1.0, 9);
  });

  it('handles large negative offset', () => {
    expect(phaseOffset(0.000, 1.000)).toBeCloseTo(-1.0, 9);
  });

  it('implementation is pure arithmetic with no allocations', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/phase-offset.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
  });
});