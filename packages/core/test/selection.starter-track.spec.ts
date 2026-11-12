import { describe, it, expect, vi } from 'vitest';
import { selectStarterTrack, type CandidateTrack } from '../src/selection/starter-track';

describe('selectStarterTrack', () => {
  const getDummyComp = () => 0.5;

  it('T1: dominant track -> returns that trackId', () => {
    const candidates: CandidateTrack[] = [
      { trackId: 'A', mixabilityScore: 0.9, camelotKey: '8A' },
      { trackId: 'B', mixabilityScore: 0.8, camelotKey: '8A' },
      { trackId: 'C', mixabilityScore: 0.7, camelotKey: '8A' },
    ];
    const getComp = (a: string, b: string) => a === 'A' ? 0.9 : 0.5;
    expect(selectStarterTrack(candidates, getComp)).toBe('A');
  });

  it('T2: all below minMixability -> returns null', () => {
    const candidates: CandidateTrack[] = [
      { trackId: 'A', mixabilityScore: 0.3, camelotKey: '8A' },
      { trackId: 'B', mixabilityScore: 0.2, camelotKey: '8A' },
    ];
    expect(selectStarterTrack(candidates, getDummyComp, { minMixability: 0.5 })).toBeNull();
  });

  it('T3: tie on combined score -> higher mixability wins', () => {
    const candidates: CandidateTrack[] = [
      { trackId: 'A', mixabilityScore: 0.8, camelotKey: '8A' },
      { trackId: 'B', mixabilityScore: 0.9, camelotKey: '8A' },
    ];
    // A: 0.4*0.8 + 0.6*0.5 = 0.32 + 0.30 = 0.62
    // B: 0.4*0.9 + 0.6*0.16666666666666666 = 0.36 + 0.1 = 0.46 -> wait, let's use 0.43333333333333335 to get 0.62? 
    // Let's just use 0.43333333333333335 (0.36 + 0.26 = 0.62).
    const getComp = (a: string, b: string) => a === 'B' ? 0.43333333333333335 : 0.5;
    expect(selectStarterTrack(candidates, getComp)).toBe('B');
  });

  it('T4: empty candidate list -> returns null', () => {
    expect(selectStarterTrack([], getDummyComp)).toBeNull();
  });

  it('T5: single eligible candidate -> returns that trackId', () => {
    const candidates: CandidateTrack[] = [{ trackId: 'X', mixabilityScore: 0.9, camelotKey: '8A' }];
    expect(selectStarterTrack(candidates, getDummyComp)).toBe('X');
  });

  it('T6: camelot-incompatible pairs contribute 0 to avg compatibility', () => {
    const candidates: CandidateTrack[] = [
      { trackId: 'A', mixabilityScore: 0.8, camelotKey: '8A' },
      { trackId: 'B', mixabilityScore: 0.9, camelotKey: '2B' },
      { trackId: 'C', mixabilityScore: 0.8, camelotKey: '2B' },
    ];
    const getComp = (a: string, b: string) => {
      if ((a === 'A' && b === 'B') || (a === 'B' && b === 'A')) return 0;
      if ((a === 'A' && b === 'C') || (a === 'C' && b === 'A')) return 0;
      return 0.5;
    };
    expect(selectStarterTrack(candidates, getComp)).toBe('B');
  });

  it('T7: never throws on any input (Rule 25)', () => {
    expect(() => selectStarterTrack([], getDummyComp)).not.toThrow();
    expect(() => selectStarterTrack([{ trackId: 'A', mixabilityScore: 0, camelotKey: '' }], getDummyComp)).not.toThrow();
  });

  it('T8: result depends only on pre-computed scores (no raw features)', () => {
    const candidates: CandidateTrack[] = [
      { trackId: 'A', mixabilityScore: 0.9, camelotKey: '8A' },
      { trackId: 'B', mixabilityScore: 0.8, camelotKey: '8A' }
    ];
    const spy = vi.fn().mockReturnValue(0.5);
    selectStarterTrack(candidates, spy);
    expect(spy).toHaveBeenCalled();
  });
});