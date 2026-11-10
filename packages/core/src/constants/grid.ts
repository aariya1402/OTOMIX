// OTOMIX §3.1 (PERIOD_MIN, PERIOD_MAX, DRIFT_MAX_S, ANCHOR_SYNC_BARS)
// OTOMIX §3.2 (BODY_REALIGN_DBFS)
// OTOMIX §3.4 (FALLBACK_TRANSIENT_DBFS, CORR_MIN, SHAPE_VAR_MAX)
// OTOMIX §3.5 (STRAIGHT_VAR, TRIPLET_VAR, SWING_MIN, SWING_MAX, IRREGULAR_XFADE_EXTRA_MS)
// OTOMIX §3.6 (RATE_MIN, RATE_MAX, RATE_SLEW_PER_S, REALIGN_MAX_SEMITONES)
// OTOMIX §3.7 (GLIDE_MAX, PITCH_NODE_SEMITONES)
// OTOMIX §3.9 (STATIC_GRID_BPM, SAFETY_XFADE_BARS)
// OTOMIX §3.3 (QUANTUM_DIVISOR)
export const PERIOD_MIN = 0.95;
export const PERIOD_MAX = 1.05;
export const DRIFT_MAX_S = 0.05;
export const ANCHOR_SYNC_BARS = 16;
export const BODY_REALIGN_DBFS = -40;
export const FALLBACK_TRANSIENT_DBFS = -12;
export const CORR_MIN = 0.85;
export const SHAPE_VAR_MAX = 0.15;
export const STRAIGHT_VAR = 0.02;
export const TRIPLET_VAR = 0.05;
export const SWING_MIN = 0.05;
export const SWING_MAX = 0.33;
export const IRREGULAR_XFADE_EXTRA_MS = 10;
export const STATIC_GRID_BPM = 120;
export const SAFETY_XFADE_BARS = 4;
export const QUANTUM_DIVISOR = 24;
export const GLIDE_MAX = 0.08;
export const PITCH_NODE_SEMITONES = 1;
export const REALIGN_MAX_SEMITONES = 0.05;
export const RATE_MIN = 0.98;
export const RATE_MAX = 1.02;
export const RATE_SLEW_PER_S = 0.005;

export const GRID_CONSTANTS = Object.freeze({
  PERIOD_MIN,
  PERIOD_MAX,
  DRIFT_MAX_S,
  ANCHOR_SYNC_BARS,
  BODY_REALIGN_DBFS,
  FALLBACK_TRANSIENT_DBFS,
  CORR_MIN,
  SHAPE_VAR_MAX,
  STRAIGHT_VAR,
  TRIPLET_VAR,
  SWING_MIN,
  SWING_MAX,
  IRREGULAR_XFADE_EXTRA_MS,
  STATIC_GRID_BPM,
  SAFETY_XFADE_BARS,
  QUANTUM_DIVISOR,
  GLIDE_MAX,
  PITCH_NODE_SEMITONES,
  REALIGN_MAX_SEMITONES,
  RATE_MIN,
  RATE_MAX,
  RATE_SLEW_PER_S,
});
// OTOMIX §3.2 · Body Grid constants
export const BODY_CUTOFF_HZ = 80;
export const BODY_FILTER_ORDER = 4;
export const BODY_RMS_WINDOW_MS = 5;
export const BODY_SEARCH_WINDOW_MS = 50;
// OTOMIX §3.2 · Group delay of 4th-order Butterworth @ 80Hz at 60Hz signal
// Compensated in extractBodyGrid() to report the true body peak position.
export const BODY_GROUP_DELAY_MS = 7.3;
// OTOMIX §3.2 · 4-bar cosine realignment duration
export const REALIGN_BARS = 4;
export const REALIGN_BEATS = 16; // 4 bars × 4 beats/bar