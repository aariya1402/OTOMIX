import { describe, it, expect } from 'vitest';
import { isOutsideTransitionWindow, getPassthroughAudio } from '../src/chop/passthrough';

describe('isOutsideTransitionWindow', () => {
  const windowStart = 16;
  const windowEnd = 80;

  it('returns true if fully before the window', () => {
    expect(isOutsideTransitionWindow(0, 8, windowStart, windowEnd)).toBe(true);
    expect(isOutsideTransitionWindow(0, 16, windowStart, windowEnd)).toBe(true);
  });

  it('returns true if fully after the window', () => {
    expect(isOutsideTransitionWindow(80, 100, windowStart, windowEnd)).toBe(true);
    expect(isOutsideTransitionWindow(90, 100, windowStart, windowEnd)).toBe(true);
  });

  it('returns false if fully inside the window', () => {
    expect(isOutsideTransitionWindow(20, 30, windowStart, windowEnd)).toBe(false);
  });

  it('returns false if straddling the start', () => {
    expect(isOutsideTransitionWindow(10, 20, windowStart, windowEnd)).toBe(false);
  });

  it('returns false if straddling the end', () => {
    expect(isOutsideTransitionWindow(70, 90, windowStart, windowEnd)).toBe(false);
  });
});

describe('getPassthroughAudio', () => {
  it('returns a subarray without copying underlying data (zero-copy)', () => {
    const original = new Float32Array([1, 2, 3, 4, 5, 6]);
    const view = getPassthroughAudio(original, 2, 5);
    
    expect(view.length).toBe(3);
    expect(view[0]).toBe(3);
    expect(view[2]).toBe(5);
    
    // Modify the view and check original is mutated (proving zero-copy)
    view[0] = 99;
    expect(original[2]).toBe(99);
  });
});