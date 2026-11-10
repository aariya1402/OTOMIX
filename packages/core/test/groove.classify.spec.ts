// OTOMIX §3.5 · Mother §2.5
import { describe, it, expect } from 'vitest';
import { classifyGroove } from '../src/groove/classify';

const ZEROS = new Array(16).fill(0);

function straightFixture(v: number): number[] {
  return new Array(16).fill(v);
}

function tripletFixture(offset: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 0) arr.push(0);
    else arr.push((((i - 1) / 2) % 2 === 0) ? offset : -offset);
  }
  return arr;
}

function swingFixture(delta: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 16; i++) arr.push(i % 2 === 0 ? 0 : delta);
  return arr;
}

describe('classifyGroove (P03-T05-S01-M01)', () => {
  it('classifies perfect straight as Straight', () => {
    expect(classifyGroove({ deviations: ZEROS }).mode).toBe('Straight');
  });

  it('classifies perfect triplet as Triplet', () => {
    const dev = tripletFixture(1 / 3 - 0.25);
    expect(classifyGroove({ deviations: dev }).mode).toBe('Triplet');
  });

  it('classifies typical swing as Swing', () => {
    const dev = swingFixture(0.15);
    const result = classifyGroove({ deviations: dev });
    expect(result.mode).toBe('Swing');
    expect(result.swingDisplacement).toBeCloseTo(0.15, 9);
  });

  it('Straight boundary: 1.99% (0.0199) is Straight', () => {
    expect(classifyGroove({ deviations: straightFixture(0.0199) }).mode).toBe('Straight');
  });

  it('Straight boundary: 2.01% (0.0201) is NOT Straight', () => {
    expect(classifyGroove({ deviations: straightFixture(0.0201) }).mode).not.toBe('Straight');
  });

  it('Swing boundary: 0.049 is NOT Swing', () => {
    expect(classifyGroove({ deviations: swingFixture(0.049) }).mode).not.toBe('Swing');
  });

  it('Swing boundary: 0.05 is Swing', () => {
    const result = classifyGroove({ deviations: swingFixture(0.05) });
    expect(result.mode).toBe('Swing');
    expect(result.swingDisplacement).toBeCloseTo(0.05, 9);
  });

  it('throws if deviations length is not 16', () => {
    expect(() => classifyGroove({ deviations: [0, 0, 0] })).toThrow();
  });
});