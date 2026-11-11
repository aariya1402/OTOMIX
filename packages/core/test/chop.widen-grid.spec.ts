import { describe, it, expect } from 'vitest';
import { widenChopGridIfNeeded } from '../src/chop/widen-grid';

describe('widenChopGridIfNeeded', () => {
  it('keeps the requested grid if load is below threshold', () => {
    expect(widenChopGridIfNeeded(32, 0.5, 0.85)).toBe(32);
    expect(widenChopGridIfNeeded(16, 0.84, 0.85)).toBe(16);
  });

  it('widens to 1/8 grid if load exceeds or equals threshold', () => {
    expect(widenChopGridIfNeeded(32, 0.85, 0.85)).toBe(8);
    expect(widenChopGridIfNeeded(16, 0.90, 0.85)).toBe(8);
    expect(widenChopGridIfNeeded(8, 0.99, 0.85)).toBe(8);
  });

  it('works with default threshold edge cases', () => {
    expect(widenChopGridIfNeeded(32, 0, 0.85)).toBe(32);
    expect(widenChopGridIfNeeded(32, 1, 0.85)).toBe(8);
  });
});