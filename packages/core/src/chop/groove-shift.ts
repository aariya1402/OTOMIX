import { GrooveMode } from '../groove/types';

/**
 * Applies the swing offset to every second slice boundary in place.
 * Only 'Swing' mode mutates the buffer. Odd indices (off-beats) are advanced by
 * `swingBeats`; even indices (on-beats) remain untouched.
 * 
 * Rule 23: Mutates the caller-supplied Float32Array in place (zero allocation).
 * Rule 26: All units are beats. No seconds, no BPM inside.
 */
export function applySwingToSliceBoundaries(
  boundaries: Float32Array,
  count: number,
  grooveMode: GrooveMode,
  swingBeats: number
): void {
  if (count < 0 || count > boundaries.length) {
    throw new RangeError('count must be between 0 and boundaries.length');
  }
  if (!Number.isFinite(swingBeats)) {
    throw new RangeError('swingBeats must be a finite number');
  }

  if (grooveMode !== 'Swing') {
    return;
  }

  for (let i = 1; i < count; i += 2) {
    boundaries[i] += swingBeats;
  }
}