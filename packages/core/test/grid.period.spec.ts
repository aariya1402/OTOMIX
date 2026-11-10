// OTOMIX §3.1 · Mother §2.1
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { boundPeriod } from '../src/grid/period';

describe('boundPeriod — Period bounding (P02-T01-S02-M01)', () => {
  const seedPeriod = 0.5; // 120 BPM → 0.5 s/beat
  const lowerBound = seedPeriod * 0.95; // 0.475
  const upperBound = seedPeriod * 1.05; // 0.525

  describe('Within bounds', () => {
    it('measured=0.52 → 0.52 (inside [0.475, 0.525])', () => {
      expect(boundPeriod(0.52, seedPeriod)).toBeCloseTo(0.52, 9);
    });
  });

  describe('Below lower bound', () => {
    it('measured=0.4 → 0.475 (clamped to lower)', () => {
      expect(boundPeriod(0.4, seedPeriod)).toBeCloseTo(lowerBound, 9);
    });
  });

  describe('Above upper bound', () => {
    it('measured=0.6 → 0.525 (clamped to upper)', () => {
      expect(boundPeriod(0.6, seedPeriod)).toBeCloseTo(upperBound, 9);
    });
  });

  describe('Inclusive edges (Review Checkpoint)', () => {
    it('measured=0.475 → 0.475 (exactly at lower bound)', () => {
      expect(boundPeriod(lowerBound, seedPeriod)).toBeCloseTo(lowerBound, 9);
    });

    it('measured=0.525 → 0.525 (exactly at upper bound)', () => {
      expect(boundPeriod(upperBound, seedPeriod)).toBeCloseTo(upperBound, 9);
    });
  });

  describe('Pure function contract (Review Checkpoint)', () => {
    it('implementation contains no array access or array methods', () => {
      const srcPath = path.resolve(__dirname, '../src/grid/period.ts');
      const src = fs.readFileSync(srcPath, 'utf-8');
      expect(src).not.toMatch(/\[\s*[a-zA-Z_]\w*\s*\]/);
      expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    });
  });
});