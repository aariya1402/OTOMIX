import { describe, it, expect } from 'vitest';
import { computeCompatibilityScore } from '../src/features/compatibility';
import { getAnalysisConfig } from '../src/config/analysis';

const cfg = getAnalysisConfig().compatibility.weights;

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

  it('T2: perfect pair with adjacent same mode (8A & 9A) → camelot_proximity=0.8', () => {
    // mixability=1.0, camelot=0.8, tempo=1.0, energy=1.0
    // = mixability*0.40 + camelot*0.30*0.8 + tempo*0.20 + energy*0.10
    // = 0.40 + 0.24 + 0.20 + 0.10 = 0.94
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '9A' });
    const expected = cfg.mixability * 1.0 + cfg.camelot_proximity * 0.8 + cfg.tempo_delta_score * 1.0 + cfg.energy_smoothness * 1.0;
    expect(r.score).toBeCloseTo(expected, 9);
  });

  it('T3: perfect pair with relative major/minor (8A & 8B) → camelot_proximity=0.7', () => {
    // = 0.40 + 0.30*0.7 + 0.20 + 0.10 = 0.40 + 0.21 + 0.20 + 0.10 = 0.91
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '8B' });
    const expected = cfg.mixability * 1.0 + cfg.camelot_proximity * 0.7 + cfg.tempo_delta_score * 1.0 + cfg.energy_smoothness * 1.0;
    expect(r.score).toBeCloseTo(expected, 9);
  });

  it('T4: incompatible keys (8A & 2B) → 0 (gate defense)', () => {
    const r = computeCompatibilityScore({ ...PERFECT, camelotKeyA: '8A', camelotKeyB: '2B' });
    expect(r.score).toBe(0);
  });

  it('T5: missing or invalid keys → 0', () => {
    expect(computeCompatibilityScore({ ...PERFECT }).score).toBe(0);
    expect(computeCompatibilityScore({ ...PERFECT, camelotKeyA: 'ZZ', camelotKeyB: '8A' }).score).toBe(0);
  });

  it('T6: mixability is averaged (0.5 + 1.0) → mixability=0.75', () => {
    const r = computeCompatibilityScore({
      mixabilityA: 0.5,
      mixabilityB: 1.0,
      camelotKeyA: '8A',
      camelotKeyB: '8A',
      tempo_delta_score: 1,
      energy_smoothness: 1,
    });
    // mixability=0.75, camelot=1.0, tempo=1.0, energy=1.0
    // = 0.40*0.75 + 0.30*1.0 + 0.20*1.0 + 0.10*1.0 = 0.30 + 0.30 + 0.20 + 0.10 = 0.90
    const expected = cfg.mixability * 0.75 + cfg.camelot_proximity * 1.0 + cfg.tempo_delta_score * 1.0 + cfg.energy_smoothness * 1.0;
    expect(r.score).toBeCloseTo(expected, 9);
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
    // All clamped: mixability=0.5 (100→1, NaN→0, avg=0.5), tempo=0 (-1→0), energy=0 (Infinity→0)
    // structural_match, window_cleanliness, grid_type_match have weight 0
    // = 0.40*0.5 + 0.30*1.0 + 0.20*0 + 0.10*0 = 0.20 + 0.30 + 0 + 0 = 0.50
    const expected = cfg.mixability * 0.5 + cfg.camelot_proximity * 1.0 + cfg.tempo_delta_score * 0 + cfg.energy_smoothness * 0;
    expect(r.score).toBeCloseTo(expected, 9);
  });

  it('T8: never throws on any input', () => {
    expect(() => computeCompatibilityScore({})).not.toThrow();
    expect(() => computeCompatibilityScore({ camelotKeyA: '8A' })).not.toThrow();
    expect(() => computeCompatibilityScore({ camelotKeyA: '', camelotKeyB: '' })).not.toThrow();
  });
});