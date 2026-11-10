// OTOMIX §3.4 · Mother §2.4
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pearsonCorrelation } from '../src/anchor/pearson';

describe('pearsonCorrelation', () => {
  it('perfect positive correlation -> 1.0', () => {
    const r = pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(r.r).toBeCloseTo(1.0, 9);
    expect(r.varianceZero).toBe(false);
  });

  it('perfect negative correlation -> -1.0', () => {
    const r = pearsonCorrelation([1, 2, 3, 4], [4, 3, 2, 1]);
    expect(r.r).toBeCloseTo(-1.0, 9);
    expect(r.varianceZero).toBe(false);
  });

  it('zero variance input -> 0 with flag', () => {
    const r = pearsonCorrelation([1, 2, 3, 4], [5, 5, 5, 5]);
    expect(r.r).toBe(0);
    expect(r.varianceZero).toBe(true);
  });

  it('empty arrays -> 0 with flag', () => {
    const r = pearsonCorrelation([], []);
    expect(r.r).toBe(0);
    expect(r.varianceZero).toBe(true);
  });

  it('mismatched lengths -> 0 with flag', () => {
    const r = pearsonCorrelation([1, 2, 3], [1, 2]);
    expect(r.r).toBe(0);
    expect(r.varianceZero).toBe(true);
  });

  it('single element -> 0 with flag (zero variance)', () => {
    const r = pearsonCorrelation([5], [10]);
    expect(r.r).toBe(0);
    expect(r.varianceZero).toBe(true);
  });

  it('Float32Array input works', () => {
    const r = pearsonCorrelation(
      new Float32Array([1, 2, 3, 4]),
      new Float32Array([2, 4, 6, 8])
    );
    expect(r.r).toBeCloseTo(1.0, 9);
  });

  it('implementation contains no array allocation or array methods', () => {
    const srcPath = path.resolve(__dirname, '../src/anchor/pearson.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    // Check for allocation or methods
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
    expect(src).not.toMatch(/=\s*\[\s*\]/);
  });
});