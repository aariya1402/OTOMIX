// OTOMIX §3.10 · Mother §2.10
import { describe, it, expect } from 'vitest';
import { getPreKickTime, PreKickSegment } from '../src/grid/prekick-map';
import * as fs from 'fs';
import * as path from 'path';

describe('getPreKickTime', () => {
  const segments: PreKickSegment[] = [
    { startBeat: -16, bpmSeed: 100 },
    { startBeat: -8,  bpmSeed: 110 },
  ];
  const T0 = 10.0;
  const p100 = 60 / 100;
  const p110 = 60 / 110;

  it('Beat -1 (last beat before T0) at 110 BPM', () => {
    const t = getPreKickTime(-1, segments, T0);
    expect(t).toBeCloseTo(T0 - p110, 9);
  });

  it('Beat -8 (first beat of 110 BPM segment)', () => {
    const t = getPreKickTime(-8, segments, T0);
    expect(t).toBeCloseTo(T0 - 8 * p110, 9);
  });

  it('Beat -9 (last beat of 100 BPM segment) — boundary continuity', () => {
    const t = getPreKickTime(-9, segments, T0);
    const expected = T0 - 8 * p110 - p100;
    expect(t).toBeCloseTo(expected, 9);
  });

  it('Beat -16 (first beat of 100 BPM segment)', () => {
    const t = getPreKickTime(-16, segments, T0);
    const expected = T0 - 8 * p110 - 8 * p100;
    expect(t).toBeCloseTo(expected, 9);
  });

  it('Strictly decreasing timestamps for all beats -16..-1', () => {
    let prev = T0;
    for (let i = -1; i >= -16; i--) {
      const t = getPreKickTime(i, segments, T0);
      expect(t).toBeLessThan(prev);
      prev = t;
    }
  });

  it('Piecewise consistency: each segment internally linear', () => {
    // For segment 2 (-8..-1): t(i+1) - t(i) = period (positive, later beat - earlier beat)
    for (let i = -8; i <= -2; i++) {
      const diff = getPreKickTime(i + 1, segments, T0) - getPreKickTime(i, segments, T0);
      expect(diff).toBeCloseTo(p110, 9);
    }
    // For segment 1 (-16..-9): t(i+1) - t(i) = p100 (positive)
    for (let i = -16; i <= -10; i++) {
      const diff = getPreKickTime(i + 1, segments, T0) - getPreKickTime(i, segments, T0);
      expect(diff).toBeCloseTo(p100, 9);
    }
  });

  it('Boundary continuity: t(-8) - t(-9) = p100 (not p110)', () => {
    // -8 is LATER than -9, so t(-8) - t(-9) = +p100
    const diff = getPreKickTime(-8, segments, T0) - getPreKickTime(-9, segments, T0);
    expect(diff).toBeCloseTo(p100, 9);
  });

  it('Throws for i >= 1', () => {
    expect(() => getPreKickTime(1, segments, T0)).toThrow();
    expect(() => getPreKickTime(5, segments, T0)).toThrow();
  });

  it('Throws for i === 0', () => {
    expect(() => getPreKickTime(0, segments, T0)).toThrow('Beat index 0 is not assigned');
  });

  it('Throws for empty segments', () => {
    expect(() => getPreKickTime(-1, [], T0)).toThrow('at least one segment');
  });

  it('Throws for non-increasing segments', () => {
    const bad = [{ startBeat: -8, bpmSeed: 110 }, { startBeat: -16, bpmSeed: 100 }];
    expect(() => getPreKickTime(-1, bad, T0)).toThrow('strictly increasing');
  });

  it('Single segment (uniform tempo) matches tOfI formula for negative indices', () => {
    const singleSeg = [{ startBeat: -8, bpmSeed: 120 }];
    const T0s = 5.0;
    const period = 60 / 120;
    for (let i = -1; i >= -8; i--) {
      const t = getPreKickTime(i, singleSeg, T0s);
      expect(t).toBeCloseTo(T0s + i * period, 9);
    }
  });

  it('Implementation contains no array allocation (zero-RAM check)', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/prekick-map.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/=\s*\[\s*\]/);
    expect(src).not.toMatch(/new Array|Array\(/);
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(|\.push\(/);
  });
});