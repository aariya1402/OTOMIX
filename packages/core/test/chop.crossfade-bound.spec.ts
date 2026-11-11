import { describe, it, expect } from 'vitest';
import { isCrossfadeValid } from '../src/chop/crossfade-bound';

describe('isCrossfadeValid', () => {
  it('validates correctly on 1/16 chopGrid', () => {
    // 1/16 = 0.0625. Max crossfade = 0.015625.
    expect(isCrossfadeValid(0.015625, 16)).toBe(true);   // Exactly at max
    expect(isCrossfadeValid(0.015, 16)).toBe(true);      // Below max
    expect(isCrossfadeValid(0.02, 16)).toBe(false);      // Above max
  });

  it('validates correctly on 1/8 chopGrid', () => {
    // 1/8 = 0.125. Max crossfade = 0.03125.
    expect(isCrossfadeValid(0.03125, 8)).toBe(true);
    expect(isCrossfadeValid(0.04, 8)).toBe(false);
  });

  it('validates correctly on 1/32 chopGrid', () => {
    // 1/32 = 0.03125. Max crossfade = 0.0078125.
    expect(isCrossfadeValid(0.0078125, 32)).toBe(true);
    expect(isCrossfadeValid(0.01, 32)).toBe(false);
  });

  it('rejects negative crossfade lengths', () => {
    expect(isCrossfadeValid(-0.01, 16)).toBe(false);
  });
});