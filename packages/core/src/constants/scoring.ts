// OTOMIX §4.3 (ENERGY_WEIGHTS)
// OTOMIX §4.5 (MIX_WEIGHTS, UNMIXABLE_BELOW)
// OTOMIX §4.4 (VOCAL_THRESHOLD, VOCAL_MEDIAN_S)
// OTOMIX §4.9 (RECO_WEIGHTS, TEMPO_DELTA_LIMIT)
export const ENERGY_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
export const MIX_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
export const UNMIXABLE_BELOW = 0.4;
export const VOCAL_THRESHOLD = 0.65;
export const VOCAL_MEDIAN_S = 1;
export const RECO_WEIGHTS = Object.freeze([0.6, 0.3, 0.1] as const);
export const TEMPO_DELTA_LIMIT = 0.01;

export const SCORING_CONSTANTS = Object.freeze({
  ENERGY_WEIGHTS,
  MIX_WEIGHTS,
  UNMIXABLE_BELOW,
  VOCAL_THRESHOLD,
  VOCAL_MEDIAN_S,
  RECO_WEIGHTS,
  TEMPO_DELTA_LIMIT,
});