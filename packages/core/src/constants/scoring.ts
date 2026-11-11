// OTOMIX §4.3 (ENERGY_WEIGHTS)
// OTOMIX §4.5 (MIX_WEIGHTS, UNMIXABLE_BELOW)
// OTOMIX §4.4 (VOCAL_THRESHOLD, VOCAL_MEDIAN_BEATS)
// OTOMIX §4.9 (RECO_WEIGHTS, TEMPO_DELTA_LIMIT)
export const ENERGY_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
export const MIX_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
export const UNMIXABLE_BELOW = 0.4;
export const VOCAL_THRESHOLD = 0.65;
export const VOCAL_MEDIAN_BEATS = 2;  // 1 s at 120 BPM = 2 beats
export const MIXABILITY_WEIGHTS = Object.freeze([0.30, 0.20, 0.20, 0.15, 0.15] as const); // kick_drift, bpm_clarity, bpm_accuracy, freq_clarity, overall_quality
export const RECO_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const); // mixability, camelot, tempo, energy
export const TEMPO_DELTA_LIMIT = 0.01;

export const SCORING_CONSTANTS = Object.freeze({
  ENERGY_WEIGHTS,
  MIX_WEIGHTS,
  UNMIXABLE_BELOW,
  VOCAL_THRESHOLD,
  VOCAL_MEDIAN_BEATS,
  RECO_WEIGHTS,
  TEMPO_DELTA_LIMIT,
});