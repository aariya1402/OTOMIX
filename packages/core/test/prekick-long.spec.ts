// OTOMIX 3.10 - Mother 2.10
import { describe, it, expect } from 'vitest';
import {
  shiftT0ToBarBoundary,
  getNegativeBeatTime,
} from '../src/grid/prekick-long';

describe('prekick-long (P02-T05-S01-M02)', () => {
  it('bpm=120, T0=2.0s (4 beats): 0 negatives, Bar 0 starts at 0s', () => {
    const r = shiftT0ToBarBoundary(2.0, 120);
    expect(r.negativeBeats).toBe(0);
    expect(r.barBoundarySeconds).toBeCloseTo(0.0, 6);
  });

  it('bpm=120, T0=3.5s (7 beats): 3 negatives, Bar 0 starts at 1.5s', () => {
    const r = shiftT0ToBarBoundary(3.5, 120);
    expect(r.negativeBeats).toBe(3);
    expect(r.barBoundarySeconds).toBeCloseTo(1.5, 6);
  });

  it('bpm=120, T0=3.0s (6 beats): 2 negatives, Bar 0 starts at 1.0s', () => {
    const r = shiftT0ToBarBoundary(3.0, 120);
    expect(r.negativeBeats).toBe(2);
    expect(r.barBoundarySeconds).toBeCloseTo(1.0, 6);
  });

  it('bpm=120, T0=1.0s (2 beats): 2 negatives, Bar 0 starts at 1.0s', () => {
    const r = shiftT0ToBarBoundary(1.0, 120);
    expect(r.negativeBeats).toBe(2);
    expect(r.barBoundarySeconds).toBeCloseTo(1.0, 6);
  });

  it('bpm=120, T0=1.5s (3 beats): 3 negatives, Bar 0 starts at 1.5s', () => {
    const r = shiftT0ToBarBoundary(1.5, 120);
    expect(r.negativeBeats).toBe(3);
    expect(r.barBoundarySeconds).toBeCloseTo(1.5, 6);
  });

  it('bpm=120, T0=0.5s (1 beat): 1 negative, Bar 0 starts at 0.5s', () => {
    const r = shiftT0ToBarBoundary(0.5, 120);
    expect(r.negativeBeats).toBe(1);
    expect(r.barBoundarySeconds).toBeCloseTo(0.5, 6);
  });

  it('bpm=120, T0=0s: 0 negatives', () => {
    const r = shiftT0ToBarBoundary(0, 120);
    expect(r.negativeBeats).toBe(0);
  });

  it('bpm=120, T0=8.0s (16 beats): 0 negatives, Bar 0 at 0s', () => {
    const r = shiftT0ToBarBoundary(8.0, 120);
    expect(r.negativeBeats).toBe(0);
    expect(r.barBoundarySeconds).toBeCloseTo(0.0, 6);
  });

  it('bpm=100, T0=4.2s (7 beats): 3 negatives, Bar 0 at 1.8s', () => {
    const r = shiftT0ToBarBoundary(4.2, 100);
    expect(r.negativeBeats).toBe(3);
    expect(r.barBoundarySeconds).toBeCloseTo(1.8, 6);
  });

  it('getNegativeBeatTime: bpm=120, barBoundary=1.5 -> -1 at 1.0, -2 at 0.5, -3 at 0.0', () => {
    expect(getNegativeBeatTime(-1, 1.5, 120)).toBeCloseTo(1.0, 6);
    expect(getNegativeBeatTime(-2, 1.5, 120)).toBeCloseTo(0.5, 6);
    expect(getNegativeBeatTime(-3, 1.5, 120)).toBeCloseTo(0.0, 6);
  });

  it('getNegativeBeatTime rejects -4 and 0', () => {
    expect(() => getNegativeBeatTime(-4, 1.5, 120)).toThrow();
    expect(() => getNegativeBeatTime(0, 1.5, 120)).toThrow();
  });
});