import { describe, it, expect } from 'vitest';
import { resolveTransitionWindow } from '../src/transition/window';

describe('resolveTransitionWindow (P05-ADD-T03-S02-M01)', () => {
  it('T1: no override → returns config default (16 bars * 4 = 64 beats)', () => {
    expect(resolveTransitionWindow()).toBe(64);
  });

  it('T2: override 32 → returns 32', () => {
    expect(resolveTransitionWindow(32)).toBe(32);
  });

  it('T3: override 16 → returns 16', () => {
    expect(resolveTransitionWindow(16)).toBe(16);
  });

  it('T4: zero/negative override → falls back to default (64), no throw', () => {
    expect(() => resolveTransitionWindow(0)).not.toThrow();
    expect(() => resolveTransitionWindow(-8)).not.toThrow();
    expect(resolveTransitionWindow(0)).toBe(64);
    expect(resolveTransitionWindow(-8)).toBe(64);
  });
});