import { describe, it, expect } from 'vitest';
import { OnePoleSmoother } from '../src/dsp/smoother';

describe('OnePoleSmoother', () => {
  it('initializes correctly', () => {
    const smoother = new OnePoleSmoother(0.5, 0.1);
    expect(smoother.getCurrentValue()).toBe(0.5);
  });

  it('smooths towards the target value', () => {
    const smoother = new OnePoleSmoother(0.0, 0.5);
    
    // Step 1: 0 + 0.5 * (1.0 - 0) = 0.5
    expect(smoother.process(1.0)).toBeCloseTo(0.5, 5);
    
    // Step 2: 0.5 + 0.5 * (1.0 - 0.5) = 0.75
    expect(smoother.process(1.0)).toBeCloseTo(0.75, 5);
    
    // Step 3: 0.75 + 0.5 * (1.0 - 0.75) = 0.875
    expect(smoother.process(1.0)).toBeCloseTo(0.875, 5);
  });

  it('allows changing alpha dynamically', () => {
    const smoother = new OnePoleSmoother(0.0, 0.5);
    smoother.setAlpha(1.0);
    
    // With alpha = 1.0, it should instantly jump to target
    expect(smoother.process(1.0)).toBe(1.0);
  });

  it('snapTo bypasses smoothing', () => {
    const smoother = new OnePoleSmoother(0.0, 0.1);
    smoother.snapTo(0.8);
    expect(smoother.getCurrentValue()).toBe(0.8);
  });

  it('throws RangeError for invalid alpha', () => {
    expect(() => new OnePoleSmoother(0.0, 0)).toThrow(RangeError);
    expect(() => new OnePoleSmoother(0.0, 1.1)).toThrow(RangeError);
    
    const smoother = new OnePoleSmoother(0.0, 0.5);
    expect(() => smoother.setAlpha(-0.1)).toThrow(RangeError);
  });
});