import { describe, it, expect } from 'vitest';
import { normalizeInput } from '../src/normalize';

describe('GATE0-DEC-M03 normalization policy', () => {
  it('preserves stereo storage by default and supports explicit mono analysis', () => {
    const input = {
      sampleRate: 48000,
      numberOfChannels: 2,
      length: 480,
      getChannelData: (channel: number) => new Float32Array(480).fill(channel === 0 ? 1 : 0.5),
    };
    expect(normalizeInput(input).ok && normalizeInput(input).value.length).toBe(2);
    expect(normalizeInput(input, true).ok && normalizeInput(input, true).value.length).toBe(1);
  });
});
