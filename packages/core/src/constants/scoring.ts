// OTOMIX §4.3 (ENERGY_WEIGHTS)
// OTOMIX §4.5 (MIX_WEIGHTS) — UNMIXABLE_BELOW REMOVED per Rule 25: Mixability is PREFERENCE, not GATE
// OTOMIX §4.4 (VOCAL_THRESHOLD, VOCAL_MEDIAN_BEATS)
// OTOMIX §4.9 (RECO_WEIGHTS, TEMPO_DELTA_LIMIT) — RECO_WEIGHTS now DEFAULT; actual weights from analysis-config.json (compatibility.weights)
export const ENERGY_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
export const MIX_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
// UNMIXABLE_BELOW REMOVED: Mixability is a preference score [0,1], not a hard gate.
// Low mixability = lower rank + warning color, NEVER exclusion. See Rule 25, Addendum D3.
export const VOCAL_THRESHOLD = 0.65;
export const VOCAL_MEDIAN_BEATS = 2;  // 1 s at 120 BPM = 2 beats
export const MIXABILITY_WEIGHTS = Object.freeze([0.30, 0.20, 0.20, 0.15, 0.15] as const); // kick_drift, bpm_clarity, bpm_accuracy, freq_clarity, overall_quality
// DEFAULT RECO weights (configurable via analysis-config.json → compatibility.weights):
// mixability=0.40, camelot=0.30, tempo=0.20, energy=0.10
export const RECO_WEIGHTS = Object.freeze([0.40, 0.30, 0.20, 0.10] as const); // mixability, camelot, tempo, energy
export const TEMPO_DELTA_LIMIT = 0.01;

export const SCORING_CONSTANTS = Object.freeze({
  ENERGY_WEIGHTS,
  MIX_WEIGHTS,
  VOCAL_THRESHOLD,
  VOCAL_MEDIAN_BEATS,
  RECO_WEIGHTS,
  TEMPO_DELTA_LIMIT,
});