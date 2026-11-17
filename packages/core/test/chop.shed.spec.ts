import { describe, it, expect } from 'vitest';
import { shedChopGrid } from '../src/chop/shed';

describe('shedChopGrid (P04-T02-S02-M03)', () => {
  it('widens to 1/8 when P03 starvation signal is true', () => {
    expect(shedChopGrid(32, true, 0.0, 0.85)).toBe(8);
    expect(shedChopGrid(16, true, 0.0, 0.85)).toBe(8);
    expect(shedChopGrid(8,  true, 0.0, 0.85)).toBe(8);
  });

  it('widens to 1/8 when cpuLoad >= threshold (no starvation)', () => {
    expect(shedChopGrid(32, false, 0.85, 0.85)).toBe(8);
    expect(shedChopGrid(16, false, 0.90, 0.85)).toBe(8);
    expect(shedChopGrid(8,  false, 0.99, 0.85)).toBe(8);
  });

  it('keeps requested grid when no starvation and load below threshold', () => {
    expect(shedChopGrid(32, false, 0.5,  0.85)).toBe(32);
    expect(shedChopGrid(16, false, 0.84, 0.85)).toBe(16);
    expect(shedChopGrid(8,  false, 0.0,  0.85)).toBe(8);
  });

  it('starvation signal takes precedence over low cpuLoad', () => {
    expect(shedChopGrid(32, true, 0.1, 0.85)).toBe(8);
    expect(shedChopGrid(16, true, 0.0, 0.85)).toBe(8);
  });

  it('edge: load exactly equals threshold -> shed', () => {
    expect(shedChopGrid(32, false, 0.85, 0.85)).toBe(8);
  });
});