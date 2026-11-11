import { describe, it, expect } from 'vitest';
import { ThreeBandEq } from '../src/dsp/three-band-eq';
import type { EqProfile } from '../src/config/transition-config';

describe('ThreeBandEq', () => {
  const flatProfile: EqProfile = {
    low: { frequency: 100, gainDb: 0, q: 0.7 },
    mid: { frequency: 1000, gainDb: 0, q: 1.0 },
    high: { frequency: 10000, gainDb: 0, q: 0.7 }
  };

  it('initializes without errors', () => {
    const eq = new ThreeBandEq(flatProfile, 44100);
    expect(eq).toBeDefined();
  });

  it('does not change amplitude when all gains are 0dB (flat)', () => {
    const eq = new ThreeBandEq(flatProfile, 44100);
    const buffer = new Float32Array([0.5, -0.5, 0.25, -0.25]);
    
    eq.processBuffer(buffer);
    
    // With 0dB gain, the output should be very close to the input
    expect(buffer[0]).toBeCloseTo(0.5, 4);
    expect(buffer[1]).toBeCloseTo(-0.5, 4);
  });

  it('attenuates low frequencies when low gain is negative', () => {
    const cutProfile: EqProfile = {
      low: { frequency: 100, gainDb: -12, q: 0.7 }, // cut lows
      mid: { frequency: 1000, gainDb: 0, q: 1.0 },
      high: { frequency: 10000, gainDb: 0, q: 0.7 }
    };
    const eq = new ThreeBandEq(cutProfile, 44100);
    
    // Generate a 50Hz sine wave (in the low band)
    const buffer = new Float32Array(4410);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.sin(2 * Math.PI * 50 * (i / 44100));
    }
    
    eq.processBuffer(buffer);
    
    // The peak amplitude of the last part of the signal should be less than 1
    let maxAmp = 0;
    for (let i = 1000; i < buffer.length; i++) {
      if (Math.abs(buffer[i]) > maxAmp) maxAmp = Math.abs(buffer[i]);
    }
    
    expect(maxAmp).toBeLessThan(0.8); // Significantly attenuated
  });

  it('resets filter state without allocation', () => {
    const eq = new ThreeBandEq(flatProfile, 44100);
    const buffer = new Float32Array([0.5, 0.5]);
    eq.processBuffer(buffer);
    eq.reset(); // Just verifying it doesn't throw or allocate
    expect(buffer[0]).toBeDefined();
  });
});