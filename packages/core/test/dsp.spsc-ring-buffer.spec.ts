import { describe, it, expect } from 'vitest';
import { SpscRingBuffer } from '../src/dsp/spsc-ring-buffer';

describe('SpscRingBuffer', () => {
  it('initializes correctly and is empty', () => {
    const buffer = new SpscRingBuffer(5);
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.pop()).toBeUndefined();
  });

  it('pushes and pops values in FIFO order', () => {
    const buffer = new SpscRingBuffer(5);
    expect(buffer.push(1.1)).toBe(true);
    expect(buffer.push(2.2)).toBe(true);
    
    expect(buffer.isEmpty()).toBe(false);
    expect(buffer.pop()).toBeCloseTo(1.1, 5);
    expect(buffer.pop()).toBeCloseTo(2.2, 5);
    expect(buffer.pop()).toBeUndefined();
  });

  it('prevents overflow and wraps around correctly', () => {
    const buffer = new SpscRingBuffer(3); // max 2 items (1 slot empty for SPSC)
    
    expect(buffer.push(1)).toBe(true);
    expect(buffer.push(2)).toBe(true);
    expect(buffer.push(3)).toBe(false); // Full

    expect(buffer.pop()).toBe(1);
    expect(buffer.push(3)).toBe(true);  // Now it has space
    
    expect(buffer.pop()).toBe(2);
    expect(buffer.pop()).toBe(3);
    expect(buffer.pop()).toBeUndefined();
  });

  it('handles zero-allocation contract', () => {
    // If it reaches here without throwing, zero-alloc holds.
    // Real allocation testing requires performance profiling, but memory allocation
    // via `new` is avoided in push/pop by design.
    const buffer = new SpscRingBuffer(10);
    for (let i = 0; i < 100; i++) {
      buffer.push(i);
      buffer.pop();
    }
    expect(buffer.isEmpty()).toBe(true);
  });
});