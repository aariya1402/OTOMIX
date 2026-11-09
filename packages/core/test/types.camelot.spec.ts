import { describe, it, expect } from 'vitest';
import { CamelotKey } from '../src/types/camelot';

describe('CamelotKey.parse', () => {
  it('accepts 1A', () => {
    const result = CamelotKey.parse('1A');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('1A');
    }
  });

  it('accepts 12B', () => {
    const result = CamelotKey.parse('12B');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('12B');
    }
  });

  it('accepts 9A (max single-digit)', () => {
    const result = CamelotKey.parse('9A');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('9A');
    }
  });

  it('accepts 10B (min two-digit)', () => {
    const result = CamelotKey.parse('10B');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('10B');
    }
  });

  it('rejects 13A (two-digit above 12)', () => {
    const result = CamelotKey.parse('13A');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects 0B (zero prefix)', () => {
    const result = CamelotKey.parse('0B');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects 5C (invalid letter)', () => {
    const result = CamelotKey.parse('5C');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects a5 (lowercase and reversed)', () => {
    const result = CamelotKey.parse('a5');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects empty string', () => {
    const result = CamelotKey.parse('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });

  it('rejects 1a (lowercase letter)', () => {
    const result = CamelotKey.parse('1a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INVALID_ARGUMENT');
    }
  });
});
