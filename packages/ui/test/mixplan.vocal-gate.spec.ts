// OTOMIX §4.4 · Vocal Gate for MixPlan (P08-T04-S02-M01)
// Tests for applyVocalGate: shifts transition window to nearest instrumental block when V_map=1

import { describe, it, expect } from 'vitest';
import { applyVocalGate, TransitionWindow } from '../src/mixplan/vocal-gate';

describe('Vocal Gate (P08-T04-S02-M01)', () => {
  const blockSize = 16; // 16 beats = 4 bars

  function makeVocalMap(vocalRanges: Array<[number, number]>, length: number): number[] {
    const map = new Array(length).fill(0);
    for (const [start, end] of vocalRanges) {
      for (let i = start; i < end && i < length; i++) {
        map[i] = 1;
      }
    }
    return map;
  }

  it('T1: returns original window when no vocal overlap', () => {
    const vocalMap = new Array(100).fill(0); // fully instrumental
    const window: TransitionWindow = { startBeat: 10, endBeat: 26 };
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(false);
    expect(result.shiftAmount).toBe(0);
    expect(result.window.startBeat).toBe(10);
    expect(result.window.endBeat).toBe(26);
  });

  it('T2: shifts window when it overlaps with vocal region', () => {
    // Vocal from beat 10 to 40 (exclusive), instrumental from 40 onwards
    const vocalMap = makeVocalMap([[10, 40]], 100);
    const window = { startBeat: 20, endBeat: 36 }; // overlaps with vocal (10-39)
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(true);
    expect(result.shiftAmount).toBe(20); // shift to beat 40 (first fully instrumental 16-beat block)
    expect(result.window.startBeat).toBe(40);
  });

  it('T3: shifts to nearest instrumental block after vocal region', () => {
    // Vocal from beat 10 to 30 (exclusive), instrumental from 30 onwards
    const vocalMap = makeVocalMap([[10, 30]], 60);
    const window = { startBeat: 20, endBeat: 36 }; // overlaps with vocal (10-29)
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(true);
    // First fully instrumental 16-beat block starts at 30
    expect(result.shiftAmount).toBe(10);
    expect(result.window.startBeat).toBe(30);
  });

  it('T4: returns original window when already in instrumental block', () => {
    const vocalMap = new Array(100).fill(0); // fully instrumental
    const window = { startBeat: 5, endBeat: 21 };
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(false);
    expect(result.shiftAmount).toBe(0);
    expect(result.window.startBeat).toBe(5);
    expect(result.window.endBeat).toBe(21);
  });

  it('T5: window at boundary of vocal region', () => {
    // Vocal from 10-40 (exclusive), window starts at 40 (boundary)
    const vocalMap = makeVocalMap([[10, 40]], 100);
    const window = { startBeat: 40, endBeat: 56 };
    const result = applyVocalGate(window, vocalMap, 16);

    // Window starts exactly at end of vocal region, so no overlap
    expect(result.shifted).toBe(false);
    expect(result.window.startBeat).toBe(40);
  });

  it('T6: window partially overlaps at end', () => {
    // Vocal from 10-40 (exclusive), window ends at 45 (overlaps 40-45)
    const vocalMap = makeVocalMap([[10, 40]], 100);
    const window = { startBeat: 29, endBeat: 45 };
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(true);
    // Current beat is 29, nearest instrumental block starts at 40
    // Shift = 40 - 29 = 11, new window = 40-56
    expect(result.shiftAmount).toBe(11);
    expect(result.window.startBeat).toBe(40);
  });

  it('T7: empty vocal map returns original window', () => {
    const window = { startBeat: 10, endBeat: 26 };
    const result = applyVocalGate(window, [], 16);

    expect(result.shifted).toBe(false);
    expect(result.window.startBeat).toBe(10);
  });

  it('T8: vocal map shorter than window returns original', () => {
    const vocalMap = new Array(10).fill(0); // too short
    const window = { startBeat: 5, endBeat: 21 };
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(false);
  });

  it('T9: tie-breaker picks smaller (more negative) shift when distances equal', () => {
    // Vocal from 16 to 40 (exclusive), leaving instrumental blocks at 0-15 and 40-55
    // Current at 20: block 0-15 (shift -20, dist 20), block 40-55 (shift +20, dist 20)
    // Tie-breaker should pick -20 (smaller/more negative)
    const vocalMap = makeVocalMap([[16, 40]], 60);
    const window = { startBeat: 20, endBeat: 36 };
    const result = applyVocalGate(window, vocalMap, 16);

    expect(result.shifted).toBe(true);
    // Both blocks distance 20 away, tie-breaker picks -20 (smaller)
    expect(result.shiftAmount).toBe(-20);
    expect(result.window.startBeat).toBe(0);
  });
});