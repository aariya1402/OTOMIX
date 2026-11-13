import { describe, it, expect } from 'vitest';
import { findNearestInstrumentalBlock } from '../src/vocal/nearest-instrumental';

describe('Nearest Instrumental Block (P05-T03-S01-M04)', () => {
  it('T1: shifts to the first instrumental 16-beat block after vocal region', () => {
    const map = new Array(100).fill(1);
    for (let i = 41; i < 100; i++) map[i] = 0;
    const currentBeat = 40;
    const shift = findNearestInstrumentalBlock(map, currentBeat, 16);
    expect(shift).toBe(1); // 41 - 40
  });

  it('T2: tie-break picks the smaller shift', () => {
    const map = new Array(60).fill(1);
    for (let i = 10; i <= 25; i++) map[i] = 0;
    for (let i = 31; i <= 46; i++) map[i] = 0;
    const currentBeat = 20;
    const shift = findNearestInstrumentalBlock(map, currentBeat, 16);
    expect(shift).toBe(-10); // 10 - 20 = -10 (vs 31 - 20 = +11)
  });

  it('T3: returns 0 when already in an instrumental block', () => {
    const map = new Array(100).fill(0);
    const currentBeat = 5;
    const shift = findNearestInstrumentalBlock(map, currentBeat, 16);
    expect(shift).toBe(0); // 5 is inside the block starting at 0
  });

  it('T4: empty map returns 0', () => {
    expect(findNearestInstrumentalBlock([], 0, 16)).toBe(0);
  });
});