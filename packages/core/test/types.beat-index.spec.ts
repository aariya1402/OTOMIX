import { describe, it, expect } from 'vitest';
import { BeatIndex } from '../src/types/beat-index';

describe('BeatIndex.parse', () => {
  it('accepts -5 (pre-kick gap >= 1 bar)', () => {
    const result = BeatIndex.parse(-5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(-5);
    }
  });

  it('accepts -1 (pre-kick gap < 1 bar)', () => {
    const result = BeatIndex.parse(-1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(-1);
    }
  });

  it('accepts 1 (initial kick downbeat)', () => {
    const result = BeatIndex.parse(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(1);
    }
  });

  it('accepts Number.MAX_SAFE_INTEGER', () => {
    const v = Number.MAX_SAFE_INTEGER;
    const result = BeatIndex.parse(v);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(v);
    }
  });

  it('accepts Number.MIN_SAFE_INTEGER', () => {
    const v = Number.MIN_SAFE_INTEGER;
    const result = BeatIndex.parse(v);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(v);
    }
  });

  it('rejects 0 (index zero is not assigned)', () => {
    const result = BeatIndex.parse(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects -0 (equals zero)', () => {
    const result = BeatIndex.parse(-0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects 1.5 (non-integer)', () => {
    const result = BeatIndex.parse(1.5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects NaN', () => {
    const result = BeatIndex.parse(NaN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects Infinity', () => {
    const result = BeatIndex.parse(Infinity);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects Number.MAX_SAFE_INTEGER + 1 (unsafe)', () => {
    const result = BeatIndex.parse(Number.MAX_SAFE_INTEGER + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });
});
