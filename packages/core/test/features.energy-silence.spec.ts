import { describe, it, expect } from 'vitest';
import { isSilentBlock, getSilentEnergy } from '../src/features/energy-silence';

describe('Silence Detection (P05-T02-S02-M02)', () => {
  it('T1: block of all zeros is silent', () => {
    const isSilent = isSilentBlock({ rms_energy: 0, average_loudness: 0 });
    expect(isSilent).toBe(true);
  });

  it('T2: returns E=0 and stars=0 for silent block', () => {
    const res = getSilentEnergy();
    expect(res.E).toBe(0);
    expect(res.stars).toBe(0);
  });

  it('T3: non-zero rms_energy is not silent', () => {
    const isSilent = isSilentBlock({ rms_energy: 0.1, average_loudness: 0 });
    expect(isSilent).toBe(false);
  });

  it('T4: non-zero average_loudness is not silent', () => {
    const isSilent = isSilentBlock({ rms_energy: 0, average_loudness: 0.5 });
    expect(isSilent).toBe(false);
  });
});