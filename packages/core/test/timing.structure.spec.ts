// OTOMIX §3.15 · Mother §2.3; Add. §4
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  floorMod,
  beatInBar,
  barIndex,
  blockPosition,
  isBlockBoundary,
  BEATS_PER_BAR,
} from '../src/timing/structure';

describe('floorMod', () => {
  it('positive x', () => {
    expect(floorMod(0, 4)).toBe(0);
    expect(floorMod(3, 4)).toBe(3);
    expect(floorMod(4, 4)).toBe(0);
    expect(floorMod(5, 4)).toBe(1);
  });

  it('negative x', () => {
    expect(floorMod(-1, 4)).toBe(3);
    expect(floorMod(-2, 4)).toBe(2);
    expect(floorMod(-4, 4)).toBe(0);
    expect(floorMod(-5, 4)).toBe(3);
  });

  it('throws on non-positive modulus', () => {
    expect(() => floorMod(1, 0)).toThrow(RangeError);
    expect(() => floorMod(1, -1)).toThrow(RangeError);
    expect(() => floorMod(1, 1.5)).toThrow(RangeError);
  });
});

describe('beatInBar — 1..4 within 4/4 bar', () => {
  const cases = [
    [-5, 3],
    [-1, 3],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 1],
    [17, 1],
    [64, 4],
    [65, 1],
  ] as const;

  for (const [i, expected] of cases) {
    it(`beatInBar(${i}) = ${expected}`, () => {
      expect(beatInBar(i)).toBe(expected);
    });
  }
});

describe('barIndex — absolute 0-based bar number', () => {
  const cases = [
    [-5, -2],
    [-1, -1],
    [1, 0],
    [4, 0],
    [5, 1],
    [17, 4],
    [64, 15],
    [65, 16],
  ] as const;

  for (const [i, expected] of cases) {
    it(`barIndex(${i}) = ${expected}`, () => {
      expect(barIndex(i)).toBe(expected);
    });
  }
});

describe('blockPosition — 0-based position within nBars-block', () => {
  const nBarsValues = [4, 8, 16, 32] as const;

  for (const nBars of nBarsValues) {
    const blockBeats = BEATS_PER_BAR * nBars;

    describe(`nBars=${nBars} (${blockBeats} beats/block)`, () => {
      it('beat 1 → position 0', () => {
        expect(blockPosition(1, nBars)).toBe(0);
      });

      it(`beat ${blockBeats} → position ${blockBeats - 1}`, () => {
        expect(blockPosition(blockBeats, nBars)).toBe(blockBeats - 1);
      });

      it(`beat ${blockBeats + 1} → position 0 (next block)`, () => {
        expect(blockPosition(blockBeats + 1, nBars)).toBe(0);
      });

      if (nBars === 16) {
        it('blockPosition(65, 16) = 0', () => {
          expect(blockPosition(65, 16)).toBe(0);
        });
      }

      it(`beat -1 → position ${floorMod(-2, blockBeats)}`, () => {
        expect(blockPosition(-1, nBars)).toBe(floorMod(-2, blockBeats));
      });

      it(`beat -${blockBeats} → position ${floorMod(-blockBeats - 1, blockBeats)}`, () => {
        expect(blockPosition(-blockBeats, nBars)).toBe(floorMod(-blockBeats - 1, blockBeats));
      });
    });
  }

  it('throws on invalid nBars', () => {
    expect(() => blockPosition(1, 0)).toThrow(RangeError);
    expect(() => blockPosition(1, -1)).toThrow(RangeError);
    expect(() => blockPosition(1, 2)).toThrow(RangeError);
    expect(() => blockPosition(1, 6)).toThrow(RangeError);
  });
});

describe('isBlockBoundary — true on first beat of each nBars-block', () => {
  const nBarsValues = [4, 8, 16, 32] as const;

  for (const nBars of nBarsValues) {
    const blockBeats = BEATS_PER_BAR * nBars;

    describe(`nBars=${nBars}`, () => {
      it('beat 1 → true', () => {
        expect(isBlockBoundary(1, nBars)).toBe(true);
      });

      it(`beat ${blockBeats} → false`, () => {
        expect(isBlockBoundary(blockBeats, nBars)).toBe(false);
      });

      it(`beat ${blockBeats + 1} → true`, () => {
        expect(isBlockBoundary(blockBeats + 1, nBars)).toBe(true);
      });

      if (nBars === 16) {
        it('isBlockBoundary(65, 16) = true', () => {
          expect(isBlockBoundary(65, 16)).toBe(true);
        });
        it('isBlockBoundary(-63, 16) = true', () => {
          expect(isBlockBoundary(-63, 16)).toBe(true);
        });
        it('isBlockBoundary(-1, 16) = false', () => {
          expect(isBlockBoundary(-1, 16)).toBe(false);
        });
      }
    });
  }
});

describe('Zero-RAM contract (Review Checkpoint)', () => {
  it('implementation contains no array allocation or array methods', () => {
    const srcPath = path.resolve(__dirname, '../src/timing/structure.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\[\s*[a-zA-Z_]\w*\s*\]/);
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
    expect(src).not.toMatch(/\{\s*\}/);
  });
});