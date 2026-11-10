// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { computeDrift } from '../src/observer/drift';

describe('computeDrift (P03-T04-S01-M01)', () => {
  it('primary case: context 3.5ms ahead of grid', () => {
    expect(computeDrift(10.000, 10.0035)).toBeCloseTo(3.5, 6);
  });

  it('zero drift when clocks match', () => {
    expect(computeDrift(10.000, 10.000)).toBeCloseTo(0, 6);
  });

  it('negative drift when context is behind grid', () => {
    expect(computeDrift(10.000, 9.998)).toBeCloseTo(-2.0, 6);
  });

  it('very small positive drift', () => {
    expect(computeDrift(10.000, 10.000001)).toBeCloseTo(0.001, 6);
  });

  it('large positive drift (50ms)', () => {
    expect(computeDrift(10.000, 10.050)).toBeCloseTo(50.0, 6);
  });

  it('large negative drift (-50ms)', () => {
    expect(computeDrift(10.000, 9.950)).toBeCloseTo(-50.0, 6);
  });

  it('implementation is pure arithmetic with no allocations', () => {
    const srcPath = path.resolve(__dirname, '../src/observer/drift.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
  });
});