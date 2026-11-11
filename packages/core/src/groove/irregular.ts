// OTOMIX §3.5 · Mother §2.5
import { IRREGULAR_XFADE_EXTRA_QUANTA } from '../constants/grid';
import { GrooveMode } from './types';

/**
 * Resolves the effective groove mode for rendering.
 * Irregular/hybrid grooves fall back to Straight to guarantee a valid plan.
 *
 * @param mode - Classified groove mode
 * @returns 'Straight' if mode is 'Irregular', otherwise mode unchanged
 */
export function resolveGrooveMode(mode: GrooveMode): GrooveMode {
  return mode === 'Irregular' ? 'Straight' : mode;
}

/**
 * Extends the micro-crossfade window for irregular grooves.
 * Adds IRREGULAR_XFADE_EXTRA_QUANTA (0.48) when mode is Irregular.
 *
 * @param baseCrossfadeQuanta - Base crossfade duration in quanta
 * @param mode - Classified groove mode (pre-resolution)
 * @returns Extended crossfade in quanta
 */
export function extendCrossfadeForIrregular(
  baseCrossfadeQuanta: number,
  mode: GrooveMode
): number {
  return mode === 'Irregular'
    ? baseCrossfadeQuanta + IRREGULAR_XFADE_EXTRA_QUANTA
    : baseCrossfadeQuanta;
}