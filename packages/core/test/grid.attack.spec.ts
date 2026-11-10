// OTOMIX §3.2 · Mother §2.2
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractAttackGrid } from '../src/grid/attack';

const SR = 44100;
const BEAT_SAMPLES = SR * 60 / 120;
const BAR_BEATS = 4;
const NUM_BARS = 8;
const TOTAL_BEATS = NUM_BARS * BAR_BEATS;
const PADDING_START = 4096;
const PADDING_END = 4096;
const TOTAL_SAMPLES = TOTAL_BEATS * BEAT_SAMPLES + PADDING_START + PADDING_END;

describe('extractAttackGrid', () => {
  it('detects 32 onsets within ±1024 samples of true positions', () => {
    const pcm = new Float32Array(TOTAL_SAMPLES);
    const expected: number[] = [];
    for (let n = 0; n < TOTAL_BEATS; n++) {
      const idx = PADDING_START + Math.round(n * BEAT_SAMPLES);
      pcm[idx] = 1.0;
      expected.push(idx);
    }
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] += (Math.random() - 0.5) * 0.002;
    }
    const onsets = extractAttackGrid(pcm, SR);
    expect(onsets.length).toBe(32);
    for (let i = 0; i < 32; i++) {
      expect(Math.abs(onsets[i] - expected[i])).toBeLessThanOrEqual(1024);
    }
  });

  it('returns zero onsets for continuous 60 Hz sine (sub-200 Hz)', () => {
    const pcm = new Float32Array(TOTAL_SAMPLES);
    const freq = 60;
    const amp = 0.1;
    for (let i = 0; i < TOTAL_SAMPLES; i++) {
      pcm[i] = amp * Math.sin(2 * Math.PI * freq * i / SR);
    }
    const onsets = extractAttackGrid(pcm, SR);
    expect(onsets.length).toBe(0);
  });

  it('returns empty array for input shorter than window', () => {
    expect(extractAttackGrid(new Float32Array(100), SR)).toEqual([]);
  });

  it('throws on non-44.1 kHz sample rate', () => {
    expect(() => extractAttackGrid(new Float32Array(2048), 48000)).toThrow('Only 44.1 kHz supported');
  });

  it('implementation contains no array allocation methods in attack.ts', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/attack.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
  });
});