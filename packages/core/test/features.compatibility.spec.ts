import { describe, it, expect } from 'vitest';
import { computeCompatibilityScore } from '../src/features/compatibility';

const PERFECT = {
  mixabilityA: 1,
  mixabilityB: 1,
  tempo_delta_score: 1,
  energy_smoothness: 1,
  structural_match: 1,
  window_cleanliness_A: 1,
  window_cleanliness_B: 1,
  grid_type_match: 1,
};

describe('computeCompatibilityScore', () => {
  it('T1: perfect pair with same key → 1.0', () => {
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '8A' });
    expect(r.score).toBeCloseTo(1.0, 9);
  });

  it('T2: perfect pair with adjacent same mode (8A & 9A) → ≈0.96', () => {
    // 0.30 + 0.20*0.8 + 0.15 + 0.15 + 0.10 + 0.05 + 0.05 = 0.96
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '9A' });
    expect(r.score).toBeCloseTo(0.96, 9);
  });

  it('T3: perfect pair with relative major/minor (8A & 8B) → ≈0.94', () => {
    // 0.30 + 0.20*0.7 + 0.15 + 0.15 + 0.10 + 0.05 + 0.05 = 0.94
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '8B' });
    expect(r.score).toBeCloseTo(0.94, 9);
  });

  it('T4: incompatible keys (8A & 2B) → 0 (gate defense)', () => {
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '2B' });
    expect(r.score).toBe(0);
  });

  it('T5: missing or invalid keys → 0', () => {
    expect(computeCompatibilityScore({ ...PERFECT }).score).toBe(0);
    expect(computeCompatibilityScore({ ...PERFECT, camelotKeyA: 'ZZ', camelotKeyB: '8A' }).score).toBe(0);
  });

  it('T6: mixability is averaged (0.5 + 1.0) → contributes 0.225', () => {
    const r = computeCompatibilityScore({
      mixabilityA: 0.5,
      mixabilityB: 1.0,
      camelotKeyA: '8A',
      camelotKeyB: '8A',
    });
    // 0.30*0.75 + 0.20*1.0 = 0.225 + 0.20 = 0.425
    expect(r.score).toBeCloseTo(0.425, 9);
  });

  it('T7: over-max, NaN, negative inputs are clamped', () => {
    const r = computeCompatibilityScore({
      mixabilityA: 100,
      mixabilityB: NaN,
      tempo_delta_score: -1,
      energy_smoothness: Number.POSITIVE_INFINITY,
      structural_match: 0.5,
      window_cleanliness_A: 0.5,
      window_cleanliness_B: 0.5,
      grid_type_match: 100,
      camelotKeyA: '8A',
      camelotKeyB: '8A',
    });
    // 0.30*0.5 + 0.20*1.0 + 0.10*0.5 + 0.05*0.5 + 0.05*1.0
    // = 0.15 + 0.20 + 0.05 + 0.025 + 0.05 = 0.475
    expect(r.score).toBeCloseTo(0.475, 9);
  });

  it('T8: never throws on any input', () => {
    expect(() => computeCompatibilityScore({})).not.toThrow();
    expect(() => computeCompatibilityScore({ camelotKeyA: '8A' })).not.toThrow();
    expect(() => computeCompatibilityScore({ camelotKeyA: '', camelotKeyB: '' })).not.toThrow();
  });
});