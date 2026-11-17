import { describe, it, expect } from 'vitest';
import {
  emptyMixplanState,
  selectStarter,
  forceInsert,
  type MixplanState,
  type StarterCandidate
} from '../src/state/mixplan';

describe('MixplanState - Starter Track & Force Insert (P05-ADD-T04-S01-M01)', () => {
  it('emptyMixplanState has the expected shape', () => {
    const state = emptyMixplanState();
    const keys: (keyof MixplanState)[] = [
      'starter',
      'compatibility_score',
      'forced',
      'forceInsertedTracks',
      'fault',
      'warnings'
    ];
    for (const k of keys) {
      expect(state).toHaveProperty(k as string);
    }
    expect(state.starter).toBeNull();
    expect(state.compatibility_score).toBe(0);
    expect(state.forced).toBe(false);
    expect(state.forceInsertedTracks).toEqual([]);
    expect(state.fault).toBeNull();
    expect(state.warnings).toEqual([]);
  });

  it('selects a compliant starter with no warnings', () => {
    const candidate: StarterCandidate = {
      trackId: 'track-a',
      compatibilityScore: 0.9,
      camelotValid: true
    };
    const state = selectStarter(candidate);
    expect(state.starter).toBe('track-a');
    expect(state.compatibility_score).toBe(0.9);
    expect(state.forced).toBe(false);
    expect(state.forceInsertedTracks).toEqual([]);
    expect(state.fault).toBeNull();
    expect(state.warnings).toEqual([]);
  });

  it('flags a starter that fails the Camelot hard gate as a SYSTEM fault', () => {
    const state = selectStarter({
      trackId: 'track-bad',
      compatibilityScore: 0.1,
      camelotValid: false
    });
    expect(state.starter).toBe('track-bad');
    expect(state.compatibility_score).toBe(0.1);
    expect(state.fault).toBe('SYSTEM');
    expect(state.warnings.length).toBeGreaterThan(0);
  });

  it('force-inserts a sub-threshold track and tags it as USER fault', () => {
    const initial = selectStarter({
      trackId: 'track-a',
      compatibilityScore: 0.9,
      camelotValid: true
    });
    const next = forceInsert(
      { trackId: 'track-bad', compatibilityScore: 0.1, camelotValid: true },
      initial,
      { minCompatibility: 0.4 }
    );
    expect(next.forced).toBe(true);
    expect(next.fault).toBe('USER');
    expect(next.compatibility_score).toBe(0.1);
    expect(next.forceInsertedTracks).toEqual(['track-bad']);
    expect(next.warnings.length).toBeGreaterThan(0);
    expect(next.starter).toBe('track-a');
  });

  it('force-inserts a track at or above threshold without USER fault', () => {
    const initial = selectStarter({
      trackId: 'track-a',
      compatibilityScore: 0.9,
      camelotValid: true
    });
    const next = forceInsert(
      { trackId: 'track-ok', compatibilityScore: 0.5, camelotValid: true },
      initial,
      { minCompatibility: 0.4 }
    );
    expect(next.forced).toBe(true);
    expect(next.fault).toBeNull();
    expect(next.compatibility_score).toBe(0.5);
    expect(next.forceInsertedTracks).toEqual(['track-ok']);
    expect(next.warnings).toEqual([]);
  });
});