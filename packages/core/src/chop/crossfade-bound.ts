import { ChopGridDenominator } from './slice';

/**
 * Validates that the requested crossfade length does not exceed 
 * one quarter of the chop grid fraction.
 * 
 * Formula: crossfadeBeats <= (1 / chopGrid) / 4
 * 
 * Rule 26: All units are beats.
 * Rule 23: No allocation.
 * 
 * @param crossfadeBeats - requested crossfade overlap in beats
 * @param chopGrid - the current chop grid (8, 16, or 32)
 * @returns true if the crossfade is safe, false otherwise
 */
export function isCrossfadeValid(
  crossfadeBeats: number,
  chopGrid: ChopGridDenominator
): boolean {
  if (crossfadeBeats < 0) {
    return false;
  }
  
  const chopGridFraction = 1 / chopGrid;
  const maxCrossfade = chopGridFraction / 4;
  
  return crossfadeBeats <= maxCrossfade + 1e-9; // 1e-9 is BEAT_EPSILON
}