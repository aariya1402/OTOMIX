// OTOMIX §3.2 · Mother §2.2
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractBodyGrid } from '../src/grid/body';

const SR = 44100;

describe('extractBodyGrid', () => {
  it('detects body peak at t+12 ms within ±5 ms', () => {
    const attackIdx = 10000;
    const bodyPeakIdx = attackIdx + Math.round(0.012 * SR); // 529 samples later
    const pcm = new Float32Array(bodyPeakIdx + 5000);

    // Attack transient (impulse)
    pcm[attackIdx] = 1.0;

    // Body: 60 Hz sine burst with Gaussian envelope centered at bodyPeakIdx
    const burstLen = Math.round(0.05 * SR); // 50 ms total
    const sigma = 0.005 * SR; // 5 ms std dev
    for (let i = -Math.floor(burstLen / 2); i < Math.floor(burstLen / 2); i++) {
      const idx = bodyPeakIdx + i;
      if (idx >= 0 && idx < pcm.length) {
        const env = Math.exp(-(i * i) / (2 * sigma * sigma));
        pcm[idx] += 0.5 * env * Math.sin((2 * Math.PI * 60 * idx) / SR);
      }
    }

    const detected = extractBodyGrid(pcm, SR, attackIdx);
    expect(detected).not.toBeNull();
    const tolerance = Math.round(0.005 * SR); // ±5 ms = 220 samples
    expect(Math.abs(detected! - bodyPeakIdx)).toBeLessThanOrEqual(tolerance);
  });

  it('returns null for input shorter than RMS window', () => {
    expect(extractBodyGrid(new Float32Array(100), SR)).toBeNull();
  });

  it('throws on non-44.1 kHz sample rate', () => {
    expect(() => extractBodyGrid(new Float32Array(1000), 48000)).toThrow('Only 44.1 kHz supported');
  });

  it('implementation contains no array allocation methods in body.ts', () => {
    const srcPath = path.resolve(__dirname, '../src/grid/body.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
  });
});