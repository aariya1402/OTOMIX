import { describe, it, expect } from 'vitest';
import { runHeapProof } from '../heap-proof';

describe('Heap Proof — Zero-RAM Timeline Generation', () => {
  it('1-minute track retains zero bytes', () => {
    const result = runHeapProof({ durationsMinutes: [1] });
    expect(result.results[0].retainedDeltaBytes).toBe(0);
  });

  it('120-minute track retains zero bytes', () => {
    const result = runHeapProof({ durationsMinutes: [120] });
    expect(result.results[0].retainedDeltaBytes).toBe(0);
  });

  it('both durations have identical zero delta', () => {
    const result = runHeapProof({ durationsMinutes: [1, 120] });
    expect(result.deltaComparison.bothZero).toBe(true);
    expect(result.deltaComparison.areEqual).toBe(true);
  });
});