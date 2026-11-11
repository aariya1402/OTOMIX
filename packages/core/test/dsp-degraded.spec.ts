import { describe, it, expect } from 'vitest';
import { MockDspDriver } from '../src/dsp/mock-driver';

describe('Degraded Mode (RUNG_STANDARD_CROSSFADE)', () => {
  it('applies standard crossfade with 0 chop slices', () => {
    const driver = new MockDspDriver();
    driver.setDegraded(true);
    expect(driver.isDegraded()).toBe(true);

    const input = [new Float32Array([1.0, 1.0, 1.0])];
    const output = [new Float32Array(3)];
    driver.process([input], [output], 0);
    
    // Check that it applied the degraded crossfade (gain from 1.0 to 0.0)
    expect(output[0][0]).toBe(1.0);
    expect(output[0][2]).toBe(0.0);
  });
});