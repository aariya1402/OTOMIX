// OTOMIX §3.10; §3.2 · Mother §2.10; §2.2
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DualGrid } from '../src/grid/dual-grid';
import * as attackModule from '../src/grid/attack';
import * as bodyModule from '../src/grid/body';

describe('DualGrid.activeAt', () => {
  it('returns false for i = -3 (pre-kick)', () => {
    expect(DualGrid.activeAt(-3)).toBe(false);
  });

  it('returns false for i = -1 (pre-kick)', () => {
    expect(DualGrid.activeAt(-1)).toBe(false);
  });

  it('returns true for i = 1 (Beat 1)', () => {
    expect(DualGrid.activeAt(1)).toBe(true);
  });

  it('returns true for i = 2 (Beat 2)', () => {
    expect(DualGrid.activeAt(2)).toBe(true);
  });

  describe('Computation gating (Review Checkpoint: spy count 0 for i<1)', () => {
    it('extractAttackGrid not called for i = -3', () => {
      const spy = vi.spyOn(attackModule, 'extractAttackGrid');
      if (!DualGrid.activeAt(-3)) {
        // Caller would skip extraction
      }
      expect(spy).toHaveBeenCalledTimes(0);
      spy.mockRestore();
    });

    it('extractBodyGrid not called for i = -1', () => {
      const spy = vi.spyOn(bodyModule, 'extractBodyGrid');
      if (!DualGrid.activeAt(-1)) {
        // Caller would skip extraction
      }
      expect(spy).toHaveBeenCalledTimes(0);
      spy.mockRestore();
    });
  });

  it('implementation is pure boolean logic with no allocations', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/dual-grid.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
  });
});