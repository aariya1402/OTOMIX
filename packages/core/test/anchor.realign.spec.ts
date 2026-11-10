// OTOMIX §3.4 · Mother §2.4
import { describe, it, expect } from 'vitest';
import { realignT0 } from '../src/anchor/realign';

describe('realignT0', () => {
  const EPS = 1e-9;

  it('happy path: moves T0 forward to earliest validated downbeat', () => {
    const result = realignT0(0.10, [8.10, 14.10, 30.10]);
    expect(result).toBeCloseTo(8.10, 9);
    expect(result).toBeGreaterThan(0.10 - EPS);
  });

  it('unsorted input: still picks earliest', () => {
    const result = realignT0(0.10, [30.10, 8.10, 14.10]);
    expect(result).toBeCloseTo(8.10, 9);
  });

  it('empty validatedDownbeats: returns candidateT0 unchanged', () => {
    const result = realignT0(0.10, []);
    expect(result).toBeCloseTo(0.10, 9);
  });

  it('single validated downbeat: moves forward', () => {
    const result = realignT0(0.10, [8.10]);
    expect(result).toBeCloseTo(8.10, 9);
  });

  it('validated downbeat equals candidate: no movement (idempotent)', () => {
    const result = realignT0(8.10, [8.10, 14.10]);
    expect(result).toBeCloseTo(8.10, 9);
  });

  it('all validated downbeats before candidate: NO backward movement', () => {
    const result = realignT0(10.0, [2.0, 5.0, 8.0]);
    expect(result).toBeCloseTo(10.0, 9);
  });

  it('handles floating point precision at boundary', () => {
    const result = realignT0(0.1, [0.1 + 1e-10, 8.10]);
    expect(result).toBeGreaterThanOrEqual(0.1 - EPS);
  });
});