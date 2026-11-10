// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { computeBufferSize } from '../src/observer/degrade';
import { BUFFER_NORMAL, BUFFER_DEGRADED, STARVATION_FRAME_MS } from '../src/constants/timing';

describe('computeBufferSize (P03-T04-S01-M03)', () => {
  it('stays at 2048 when frame time is 9.9 ms (below threshold)', () => {
    const result = computeBufferSize(BUFFER_NORMAL, 9.9);
    expect(result.bufferSize).toBe(BUFFER_NORMAL);
    expect(result.starvation).toBe(false);
  });

  it('expands to 4096 when frame time is 10.1 ms (above threshold)', () => {
    const result = computeBufferSize(BUFFER_NORMAL, 10.1);
    expect(result.bufferSize).toBe(BUFFER_DEGRADED);
    expect(result.starvation).toBe(true);
  });

  it('stays at 4096 once expanded (no auto-shrink)', () => {
    const result = computeBufferSize(BUFFER_DEGRADED, 5.0);
    expect(result.bufferSize).toBe(BUFFER_DEGRADED);
    expect(result.starvation).toBe(false);
  });

  it('exactly at threshold (10.0 ms) does not expand', () => {
    const result = computeBufferSize(BUFFER_NORMAL, STARVATION_FRAME_MS);
    expect(result.bufferSize).toBe(BUFFER_NORMAL);
    expect(result.starvation).toBe(false);
  });

  it('implementation is pure arithmetic with no allocations', () => {
    const srcPath = path.resolve(__dirname, '../src/observer/degrade.ts');
    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).not.toMatch(/\.map\(|\.reduce\(|\.filter\(|\.forEach\(/);
    expect(src).not.toMatch(/new Array|Array\(/);
  });
});