// OTOMIX §4.5 · Owner decision D3 (2026-11-12)
//
// PREFERENCE SCORE, NOT A GATE.
// The only hard gate in OTOMIX is Camelot (see camelot-gate.ts).
// A low mixability score means the track is ranked lower — never excluded.
//
// Six intrinsic factors, each weighted and combined into a score in [0,1]:
//   kick_grid_lock            (BPM fidelity)
//   drift_absence             (stability)
//   kick_clarity              (kick definition)
//   grid_type_clarity         (ATTACK vs BODY confidence)
//   transition_window_present (a clean transition exists)
//   vocal_absence             (no vocal in that window)
//
// Weights come from AnalysisConfig (D9: no hardcoded tunables).
// Rule 25: no rejection, no throwing, no boolean gate.
// Rule 26: dimensionless score, no time units.

import { getAnalysisConfig } from '../config/analysis';

export interface MixabilityFeaturesInput {
  readonly kick_grid_lock?: number;
  readonly drift_absence?: number;
  readonly kick_clarity?: number;
  readonly grid_type_clarity?: number;
  readonly transition_window_present?: number;
  readonly vocal_absence?: number;
}

export interface MixabilityResult {
  readonly score: number;
}

function clamp01(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function computeMixability(features: MixabilityFeaturesInput): MixabilityResult {
  const w = getAnalysisConfig().mixability.weights;

  const score =
    w.kick_grid_lock            * clamp01(features.kick_grid_lock) +
    w.drift_absence             * clamp01(features.drift_absence) +
    w.kick_clarity              * clamp01(features.kick_clarity) +
    w.grid_type_clarity         * clamp01(features.grid_type_clarity) +
    w.transition_window_present * clamp01(features.transition_window_present) +
    w.vocal_absence             * clamp01(features.vocal_absence);

  return { score: clamp01(score) };
}