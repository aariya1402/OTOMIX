// OTOMIX §3.1 · Mother §2.1
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getSyncedDrift,
  simulateSyncedDrift,
  getSyncPoints,
  ANCHOR_SYNC_INTERVAL_BEATS,
} from '../src/grid/anchor-sync';
import { DRIFT_MAX_QUANTA, QUANTUM_DIVISOR } from '../src/constants/grid';

describe('anchor-sync (P02-T01-S02-M02)', () => {
  const DRIFT = 0.0005; // 0.5 ms/beat

  it('sync interval derives from ANCHOR_SYNC_BARS × 4', () => {
    expect(ANCHOR_SYNC_INTERVAL_BEATS).toBe(64);
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/grid/anchor-sync.ts'),
      'utf-8',
    );
    expect(src).toMatch(/ANCHOR_SYNC_BARS\s*\*\s*4/);
  });

  it('getSyncPoints returns sync beats in [1, maxBeat]', () => {
    expect(getSyncPoints(256)).toEqual([64, 128, 192, 256]);
    expect(getSyncPoints(200)).toEqual([64, 128, 192]);
    expect(getSyncPoints(63)).toEqual([]);
    expect(getSyncPoints(64)).toEqual([64]);
  });

  it('beat 1 = 0 (reference), beats 2-63 linear, |Δ|≤0.05', () => {
    expect(getSyncedDrift(1, DRIFT, 120)).toBe(0);
    expect(getSyncedDrift(2, DRIFT, 120)).toBeCloseTo(1 * DRIFT, 9);
    expect(getSyncedDrift(63, DRIFT, 120)).toBeCloseTo(62 * DRIFT, 9);
  });

  it('beat 64 (sync #1): measured error = 63 × DRIFT = 0.0315', () => {
    expect(getSyncedDrift(64, DRIFT, 120)).toBeCloseTo(63 * DRIFT, 9);
  });

  it('beats 65-127 piecewise hold at 0.0315; beat 128 (sync #2) = 0.032', () => {
    expect(getSyncedDrift(65, DRIFT, 120)).toBeCloseTo(64 * DRIFT, 9); // hold
    expect(getSyncedDrift(127, DRIFT, 120)).toBeCloseTo(64 * DRIFT, 9); // hold
    expect(getSyncedDrift(128, DRIFT, 120)).toBeCloseTo(64 * DRIFT, 9); // sync
    expect(getSyncedDrift(192, DRIFT, 120)).toBeCloseTo(64 * DRIFT, 9); // sync
    expect(getSyncedDrift(256, DRIFT, 120)).toBeCloseTo(64 * DRIFT, 9); // sync
  });

  it('|Δ| ≤ (DRIFT_MAX_QUANTA * (60 / 120) / QUANTUM_DIVISOR) throughout 256 beats; negative drift handled', () => {
    const pos = simulateSyncedDrift(256, DRIFT, 120);
    const neg = simulateSyncedDrift(256, -DRIFT, 120);
    expect(pos.length).toBe(256);
    expect(neg.length).toBe(256);
    for (const d of pos) expect(Math.abs(d)).toBeLessThanOrEqual((DRIFT_MAX_QUANTA * (60 / 120) / QUANTUM_DIVISOR) + 1e-12);
    for (const d of neg) expect(Math.abs(d)).toBeLessThanOrEqual((DRIFT_MAX_QUANTA * (60 / 120) / QUANTUM_DIVISOR) + 1e-12);
    // Defensive clamp with extreme drift
    const extreme = simulateSyncedDrift(64, 0.001, 120);
    expect(Math.abs(extreme[62])).toBeLessThanOrEqual((DRIFT_MAX_QUANTA * (60 / 120) / QUANTUM_DIVISOR) + 1e-12);
  });
});