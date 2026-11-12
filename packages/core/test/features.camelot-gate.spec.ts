import { describe, it, expect } from 'vitest';
import { isCamelotCompatible } from '../src/features/camelot-gate';

describe('isCamelotCompatible (Camelot Gate)', () => {
  it('T1: same key → true (8A & 8A)', () => {
    expect(isCamelotCompatible('8A', '8A')).toBe(true);
  });

  it('T2: adjacent same mode → true (8A & 9A)', () => {
    expect(isCamelotCompatible('8A', '9A')).toBe(true);
  });

  it('T3: relative major/minor → true (8A & 8B)', () => {
    expect(isCamelotCompatible('8A', '8B')).toBe(true);
  });

  it('T4: wheel wrap backward → true (1A & 12A)', () => {
    expect(isCamelotCompatible('1A', '12A')).toBe(true);
  });

  it('T5: wheel wrap forward → true (12A & 1A)', () => {
    expect(isCamelotCompatible('12A', '1A')).toBe(true);
  });

  it('T6: non-compatible keys → false (8A & 2B)', () => {
    expect(isCamelotCompatible('8A', '2B')).toBe(false);
  });

  it('T7: energy-boost (adjacent + flip mode) excluded → false (8A & 9B)', () => {
    expect(isCamelotCompatible('8A', '9B')).toBe(false);
  });
});