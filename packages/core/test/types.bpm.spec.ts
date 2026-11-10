import { describe, it, expect } from 'vitest';
import { BPM } from '../src/types/bpm';

describe('BPM.parse', () => {
  it('rejects NaN', () => {
    const result = BPM.parse(NaN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects Infinity', () => {
    const result = BPM.parse(Infinity);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects -Infinity', () => {
    const result = BPM.parse(-Infinity);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects 59.999 (below lower bound)', () => {
    const result = BPM.parse(59.999);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('accepts 60.0 (inclusive lower bound)', () => {
    const result = BPM.parse(60.0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(60.0);
    }
  });

  it('accepts 200.0 (inclusive upper bound)', () => {
    const result = BPM.parse(200.0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(200.0);
    }
  });

  it('rejects 200.001 (above upper bound)', () => {
    const result = BPM.parse(200.001);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('returns a typed INVALID_ARGUMENT result, not a thrown error', () => {
    const result = BPM.parse(50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
      expect(typeof result.message).toBe('string');
      expect(result.message).toContain('60.0');
      expect(result.message).toContain('200.0');
    }
  });
});
