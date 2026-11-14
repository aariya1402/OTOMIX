// OTOMIX 3.7; 3.11 - P04-T01-S02-M01
import { describe, it, expect } from 'vitest';
import { generateGlideAutomation } from '../src/glide/schedule';

describe('generateGlideAutomation', () => {
  it('generates two linear ramps with exact window duration', () => {
    const startTime = 10;
    const windowSeconds = 32;
    
    const result = generateGlideAutomation(
      startTime, windowSeconds,
      1.00, 1.03, 
      1.00, 0.97
    );

    expect(result.outTrack).toHaveLength(1);
    expect(result.inTrack).toHaveLength(1);

    const outRamp = result.outTrack[0];
    const inRamp = result.inTrack[0];

    expect(outRamp.target).toBe(1.03);
    expect(inRamp.target).toBe(0.97);
    
    expect(outRamp.endTime - outRamp.startTime).toBe(windowSeconds);
    expect(inRamp.endTime - inRamp.startTime).toBe(windowSeconds);
    
    expect(outRamp.curve).toBe('linear');
    expect(inRamp.curve).toBe('linear');
  });
});