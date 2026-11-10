// OTOMIX §3.10 · Mother §2.10
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getPreKickBeat } from '../src/grid/prekick-short';
import { BeatIndex } from '../src/types/beat-index';

describe('getPreKickBeat', () => {
  const bpmSeed = 120;
  const T0 = 1.2;
  const period = 60 / bpmSeed;

  it('t=0.7s -> Beat -1 (exactly on beat)', () => {
    const beat = getPreKickBeat(0.7, T0, bpmSeed);
    expect(beat).toBe(-1);
  });

  it('t=0.2s -> Beat -2 (exactly on beat)', () => {
    const beat = getPreKickBeat(0.2, T0, bpmSeed);
    expect(beat).toBe(-2);
  });

  it('t=0.95s (between Beat -1 and Beat 1) -> Beat -1', () => {
    const beat = getPreKickBeat(0.95, T0, bpmSeed);
    expect(beat).toBe(-1);
  });

  it('t=0.45s (between Beat -2 and Beat -1) -> Beat -2', () => {
    const beat = getPreKickBeat(0.45, T0, bpmSeed);
    expect(beat).toBe(-2);
  });

  it('t=1.19s (just before T0) -> Beat -1', () => {
    const beat = getPreKickBeat(1.19, T0, bpmSeed);
    expect(beat).toBe(-1);
  });

  it('t=T0 exactly throws (caller handles Beat 1)', () => {
    expect(() => getPreKickBeat(T0, T0, bpmSeed)).toThrow();
  });

  it('bpm=100, T0=2.0, t=1.4 -> Beat -1 (period=0.6)', () => {
    const beat = getPreKickBeat(1.4, 2.0, 100);
    expect(beat).toBe(-1);
  });

  it('bpm=140, T0=0.8, t=0.38 -> Beat -1 (period≈0.4286)', () => {
    const beat = getPreKickBeat(0.38, 0.8, 140);
    expect(beat).toBe(-1);
  });

  it('returns branded BeatIndex type (< 0, != 0)', () => {
    const beat = getPreKickBeat(0.7, T0, bpmSeed);
    expect(typeof beat).toBe('number');
    expect(beat).toBeLessThan(0);
    expect(beat).not.toBe(0);
  });

  it('never returns 0 for any valid t < T0', () => {
    for (let t = 0.01; t < T0; t += 0.03) {
      const beat = getPreKickBeat(t, T0, bpmSeed);
      expect(beat).not.toBe(0);
      expect(beat).toBeLessThan(0);
    }
  });

  it('implementation contains no array access or array methods', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/prekick-short.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\[\s*[a-zA-Z_]\w*\s*\]/);
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
  });
});