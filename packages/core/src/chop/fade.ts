/**
 * P04-T02-S02-M01
 * Formula (OTOMIX 3.8): F_fade(t) = 0.5 * (1 + cos(PI * t / crossfadeBeats))
 * Domain: t in [0, crossfadeBeats]; outside that range t is clamped.
 *
 * All quantities are in beats. No seconds, no milliseconds.
 */

import { CHOP_CROSSFADE_BEATS } from '../constants/grid.js';

/**
 * Raised-cosine fade curve evaluated at time t (beats).
 *
 * @param t              position along the fade, in beats
 * @param crossfadeBeats total fade length, in beats (> 0)
 * @returns fade gain in [0, 1]; 1.0 at t=0, 0.0 at t=crossfadeBeats
 */
export function fadeGain(t: number, crossfadeBeats: number): number {
  if (!(crossfadeBeats > 0)) {
    throw new RangeError('fadeGain: crossfadeBeats must be > 0, got ' + crossfadeBeats);
  }
  const clamped = t < 0 ? 0 : (t > crossfadeBeats ? crossfadeBeats : t);
  return 0.5 * (1 + Math.cos((Math.PI * clamped) / crossfadeBeats));
}

/**
 * Fade curve using the project-wide default chop crossfade length.
 * Same formula, same clamp semantics as fadeGain.
 */
export function fadeGainDefault(t: number): number {
  return fadeGain(t, CHOP_CROSSFADE_BEATS);
}