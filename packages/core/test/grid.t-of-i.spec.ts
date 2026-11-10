// OTOMIX §3.1; §3.10 · Mother §2.1; §2.10
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tOfI } from '../src/grid/t-of-i';
import { BeatIndex } from '../src/types/beat-index';
import { BPM } from '../src/types/bpm';

describe('tOfI — Absolute Locked Grid mapping (P02-T01-S01-M01)', () => {
  const bpmSeed = BPM.parse(120);
  const T0 = 0.25;
  const delta = 0;

  if (!bpmSeed.ok) throw new Error('Test setup failed: invalid BPM');
  const bpm = bpmSeed.value;

  describe('Positive beat indices (i ≥ 1)', () => {
    it('i=1 → n=0 → T0 = 0.25', () => {
      const i = BeatIndex.parse(1);
      if (!i.ok) throw new Error('Test setup failed: invalid BeatIndex');
      expect(tOfI(i.value, T0, bpm, delta)).toBeCloseTo(0.25, 9);
    });

    it('i=2 → n=1 → T0 + 1×period = 0.75', () => {
      const i = BeatIndex.parse(2);
      if (!i.ok) throw new Error('Test setup failed: invalid BeatIndex');
      expect(tOfI(i.value, T0, bpm, delta)).toBeCloseTo(0.75, 9);
    });

    it('i=17 → n=16 → T0 + 16×period = 8.25', () => {
      const i = BeatIndex.parse(17);
      if (!i.ok) throw new Error('Test setup failed: invalid BeatIndex');
      expect(tOfI(i.value, T0, bpm, delta)).toBeCloseTo(8.25, 9);
    });
  });

  describe('Negative beat indices (i ≤ -1)', () => {
    it('i=-1 → n=-1 → T0 - 1×period = -0.25', () => {
      const i = BeatIndex.parse(-1);
      if (!i.ok) throw new Error('Test setup failed: invalid BeatIndex');
      expect(tOfI(i.value, T0, bpm, delta)).toBeCloseTo(-0.25, 9);
    });

    it('i=-2 → n=-2 → T0 - 2×period = -0.75', () => {
      const i = BeatIndex.parse(-2);
      if (!i.ok) throw new Error('Test setup failed: invalid BeatIndex');
      expect(tOfI(i.value, T0, bpm, delta)).toBeCloseTo(-0.75, 9);
    });

    it('i=-5 → n=-5 → T0 - 5×period = -2.25', () => {
      const i = BeatIndex.parse(-5);
      if (!i.ok) throw new Error('Test setup failed: invalid BeatIndex');
      expect(tOfI(i.value, T0, bpm, delta)).toBeCloseTo(-2.25, 9);
    });
  });

  describe('Pure function contract (Review Checkpoint)', () => {
    it('implementation contains no array access or array methods', () => {
      const srcPath = path.resolve(__dirname, '../src/grid/t-of-i.ts');
      const src = fs.readFileSync(srcPath, 'utf-8');
      // Assert there are no array bracket accesses (e.g., arr[i]) or array methods (.map, .reduce, etc.)
      expect(src).not.toMatch(/\[\s*[a-zA-Z_]\w*\s*\]/);
      expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    });
  });
});