import { describe, it, expect } from 'vitest';
import { shouldWarnStarterTrack } from '../src/state/starter-warning';

describe('P08-T03-S01-M01 starter warning', () => {
  it('warns only for identical keys with tempo delta strictly below 1 percent', () => {
    expect(shouldWarnStarterTrack({
      starter: { camelotKey: '8A', bpm: 120 },
      previous: null,
      next: { camelotKey: '8A', bpm: 120.0 * 1.009 },
    })).toBe(true);

    expect(shouldWarnStarterTrack({
      starter: { camelotKey: '8A', bpm: 120 },
      previous: null,
      next: { camelotKey: '8A', bpm: 121.2 },
    })).toBe(false);

    expect(shouldWarnStarterTrack({
      starter: { camelotKey: '8A', bpm: 120 },
      previous: null,
      next: { camelotKey: '9A', bpm: 120.6 },
    })).toBe(false);
  });
});
