import { describe, it, expect } from 'vitest';
import { recomputeOnReorder } from '../src/state/reorder';

describe('Live Re-eval (recomputeOnReorder)', () => {
  const candidates: Record<string, { mixabilityScore: number; camelotKey: string }> = {
    'A': { mixabilityScore: 0.9, camelotKey: '8A' },
    'B': { mixabilityScore: 0.8, camelotKey: '8A' },
    'C': { mixabilityScore: 0.85, camelotKey: '8A' },
    'D': { mixabilityScore: 0.3, camelotKey: '8A' },
  };

  const getCandidate = (id: string) => candidates[id] || null;
  const getCompatibility = (a: string, b: string) => 0.5;

  it('T1: minor reorder -> updates adjacent pairs only', () => {
    const newOrder = ['A', 'C', 'B'];
    const result = recomputeOnReorder(newOrder, getCandidate, getCompatibility);
    expect(result.updatedPlan).toEqual(['A', 'C', 'B']);
    expect(result.pairScores).toEqual({ 'A:C': 0.5, 'C:B': 0.5 });
    expect(result.warnings).toHaveLength(0);
  });

  it('T2: track falls below mixability gate -> flagged and removed', () => {
    const newOrder = ['A', 'D', 'B'];
    const result = recomputeOnReorder(newOrder, getCandidate, getCompatibility, { minMixability: 0.5 });
    expect(result.updatedPlan).toEqual(['A', 'B']);
    expect(result.warnings).toContain('Track D removed: mixability (0.3) fell below gate (0.5).');
    expect(result.pairScores).toEqual({ 'A:B': 0.5 });
  });

  it('T3: never throws on empty plan', () => {
    expect(() => recomputeOnReorder([], getCandidate, getCompatibility)).not.toThrow();
    const result = recomputeOnReorder([], getCandidate, getCompatibility);
    expect(result.updatedPlan).toEqual([]);
    expect(result.pairScores).toEqual({});
  });
});
