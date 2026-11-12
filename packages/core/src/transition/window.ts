// OTOMIX §3.8 — Variable transition window (P05-ADD-T03-S02-M01).
// Default window read from AnalysisConfig (defaultWindowBars * 4 beats);
// per-transition override supplied by the UI (Owner decision D8).
// No hardcoded beat/bar literals.

import { getTransitionWindowBeats } from './constants';

/**
 * Resolves the transition window in beats.
 *
 * @param overrideBeats - Optional per-transition override from the UI.
 *   Must be a finite, positive number; otherwise the config default is used.
 * @returns The window length in beats.
 */
export function resolveTransitionWindow(overrideBeats?: number): number {
  if (overrideBeats !== undefined && Number.isFinite(overrideBeats) && overrideBeats > 0) {
    return overrideBeats;
  }
  return getTransitionWindowBeats();
}