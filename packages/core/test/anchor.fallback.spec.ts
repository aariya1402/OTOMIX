// OTOMIX §3.4 · Mother §2.4
import { describe, it, expect } from 'vitest';
import { findFallbackAnchor, Transient } from '../src/anchor/fallback';

describe('findFallbackAnchor', () => {
  it('happy path: picks the first transient exceeding -12 dBFS', () => {
    const transients: Transient[] = [
      { time: 0.5, dbfs: -20 },
      { time: 1.0, dbfs: -13 },
      { time: 1.5, dbfs: -11.9 },
    ];
    expect(findFallbackAnchor(transients)).toBe(1.5);
  });

  it('returns null if no transient exceeds -12 dBFS', () => {
    const transients: Transient[] = [
      { time: 0.5, dbfs: -20 },
      { time: 1.0, dbfs: -15 },
      { time: 1.5, dbfs: -13 },
    ];
    expect(findFallbackAnchor(transients)).toBeNull();
  });

  it('boundary: exactly -12 dBFS is not picked, -11.9 is', () => {
    const transients: Transient[] = [
      { time: 0.5, dbfs: -12 },
      { time: 1.0, dbfs: -11.9 },
    ];
    expect(findFallbackAnchor(transients)).toBe(1.0);
  });

  it('first transient exceeds threshold: stops early', () => {
    const transients: Transient[] = [
      { time: 0.1, dbfs: -11 },
      { time: 0.5, dbfs: -20 },
      { time: 1.0, dbfs: -13 },
    ];
    expect(findFallbackAnchor(transients)).toBe(0.1);
  });

  it('empty array returns null', () => {
    expect(findFallbackAnchor([])).toBeNull();
  });
});