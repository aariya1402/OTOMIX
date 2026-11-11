# Group 1 — Source Files Dump

Generated: 2026-11-11 13:37:02
HEAD: f6d46ed

## File: packages/core/src/constants/grid.ts
Lines: 101
SHA256: 8D9899606F44C1455DE60D16A76B255FCB65916A59CAF9129888F5E297D22D76
```typescript
   1: // OTOMIX §3.1 (PERIOD_MIN, PERIOD_MAX, DRIFT_MAX_QUANTA, ANCHOR_SYNC_BARS)
   2: // OTOMIX §3.2 (BODY_REALIGN_DBFS)
   3: // OTOMIX §3.4 (FALLBACK_TRANSIENT_DBFS, CORR_MIN, SHAPE_VAR_MAX)
   4: // OTOMIX §3.5 (STRAIGHT_VAR, TRIPLET_VAR, SWING_MIN, SWING_MAX, IRREGULAR_XFADE_EXTRA_QUANTA)
   5: // OTOMIX §3.6 (RATE_MIN, RATE_MAX, RATE_SLEW_PER_QUANTA, REALIGN_MAX_SEMITONES)
   6: // OTOMIX §3.7 (GLIDE_MAX, PITCH_NODE_SEMITONES)
   7: // OTOMIX §3.9 (STATIC_GRID_BPM, SAFETY_XFADE_BARS)
   8: // OTOMIX §3.3 (QUANTUM_DIVISOR)
   9: export const PERIOD_MIN = 0.95;
  10: export const PERIOD_MAX = 1.05;
  11: export const DRIFT_MAX_QUANTA = 2.4;  // 2.4 quanta = 0.05s at 120 BPM
  12: export const ANCHOR_SYNC_BARS = 16;
  13: export const BODY_REALIGN_DBFS = -40;
  14: export const FALLBACK_TRANSIENT_DBFS = -12;
  15: export const CORR_MIN = 0.85;
  16: export const SHAPE_VAR_MAX = 0.15;
  17: export const STRAIGHT_VAR = 0.02;
  18: export const TRIPLET_VAR = 0.05;
  19: export const SWING_MIN = 0.05;
  20: export const SWING_MAX = 0.33;
  21: export const IRREGULAR_XFADE_EXTRA_QUANTA = 0.48;  // 0.48 quanta = 10ms at 120 BPM
  22: export const STATIC_GRID_BPM = 120;
  23: export const SAFETY_XFADE_BARS = 4;
  24: export const QUANTUM_DIVISOR = 24;
  25: export const GLIDE_MAX = 0.08;
  26: export const PITCH_NODE_SEMITONES = 1;
  27: export const REALIGN_MAX_SEMITONES = 0.05;
  28: export const RATE_MIN = 0.98;
  29: export const RATE_MAX = 1.02;
  30: export const RATE_SLEW_PER_QUANTA = 0.005 / 48;  // = 0.00010416... (0.005 rate/s at 120 BPM, beat-first)
  31: 
  32: export const GRID_CONSTANTS = Object.freeze({
  33:   PERIOD_MIN,
  34:   PERIOD_MAX,
  35:   DRIFT_MAX_QUANTA,
  36:   ANCHOR_SYNC_BARS,
  37:   BODY_REALIGN_DBFS,
  38:   FALLBACK_TRANSIENT_DBFS,
  39:   CORR_MIN,
  40:   SHAPE_VAR_MAX,
  41:   STRAIGHT_VAR,
  42:   TRIPLET_VAR,
  43:   SWING_MIN,
  44:   SWING_MAX,
  45:   IRREGULAR_XFADE_EXTRA_QUANTA,
  46:   STATIC_GRID_BPM,
  47:   SAFETY_XFADE_BARS,
  48:   QUANTUM_DIVISOR,
  49:   GLIDE_MAX,
  50:   PITCH_NODE_SEMITONES,
  51:   REALIGN_MAX_SEMITONES,
  52:   RATE_MIN,
  53:   RATE_MAX,
  54:   RATE_SLEW_PER_QUANTA,
  55: });
  56: // OTOMIX §3.2 · Body Grid constants
  57: export const BODY_CUTOFF_HZ = 80;
  58: export const BODY_FILTER_ORDER = 4;
  59: export const BODY_RMS_WINDOW_MS = 5;
  60: export const BODY_SEARCH_WINDOW_MS = 50;
  61: // OTOMIX §3.2 · Group delay of 4th-order Butterworth @ 80Hz at 60Hz signal
  62: // Compensated in extractBodyGrid() to report the true body peak position.
  63: export const BODY_GROUP_DELAY_MS = 7.3;
  64: // OTOMIX §3.2 · 4-bar cosine realignment duration
  65: export const REALIGN_BARS = 4;
  66: export const REALIGN_BEATS = 16; // 4 bars × 4 beats/bar
  67: // ============================================================================
  68: // OTOMIX §3.2; §3.6 — Constants that were previously hardcoded
  69: // ============================================================================
  70: 
  71: /** Beats per bar (standard 4/4 time signature) */
  72: export const BEATS_PER_BAR = 4;
  73: 
  74: /** Sample rate for all DSP operations (Hz) */
  75: export const SAMPLE_RATE = 44100;
  76: 
  77: /** Attack Grid: FFT window size (samples) */
  78: export const ATTACK_WINDOW_SIZE = 2048;
  79: 
  80: /** Attack Grid: FFT hop size (samples) — 50% overlap */
  81: export const ATTACK_HOP_SIZE = 1024;
  82: 
  83: /** Attack Grid: frequency cutoff (Hz) — ignore bins below this */
  84: export const ATTACK_CUTOFF_HZ = 200;
  85: 
  86: /** Observer log realignment: curve shape parameter (k) */
  87: export const LOG_REALIGN_K = 3;
  88: 
  89: /** Pre-kick mapping: tolerance for floating-point beat boundary detection */
  90: export const BEAT_EPSILON = 1e-9;
  91: 
  92: /** Observer scale: rate range span (RATE_MAX - RATE_MIN = 0.04, half = 0.02) */
  93: export const OBSERVER_GAIN_RANGE = 0.02;
  94: 
  95: /** Observer scale: maximum expected drift before rate hits bound (quanta) */
  96: export const OBSERVER_MAX_EXPECTED_DRIFT_QUANTA = 2.4;  // 2.4 quanta = 50ms at 120 BPM
  97: /** Transition window: 16 bars (4/4 time) = 64 beats */
  98: export const TRANSITION_WINDOW_BARS = 16;
  99: export const TRANSITION_WINDOW_BEATS = TRANSITION_WINDOW_BARS * BEATS_PER_BAR;
 100: /** Safety net crossfade duration: 4 bars × 4 beats/bar = 16 beats */
 101: export const SAFETY_XFADE_BEATS = SAFETY_XFADE_BARS * BEATS_PER_BAR;
```

## File: packages/core/src/constants/timing.ts
Lines: 27
SHA256: F1107A26FC5BA895E1EB29C11565366871B80064AD203264C0A53ABAF8228412
```typescript
   1: // OTOMIX §3.3; §3.6; §3.11; §4.1; §8.3
   2: export const LOOKAHEAD_MS = 50;
   3: export const SCHED_ACCURACY_MS = 2;
   4: export const DRIFT_THRESHOLD_QUANTA = 0.192;  // 0.192 quanta = 4ms at 120 BPM
   5: export const STARVATION_FRAME_MS = 10;
   6: export const BUFFER_NORMAL = 2048;
   7: export const BUFFER_DEGRADED = 4096;
   8: export const PORT_BUFFER_SAMPLES = 1024;
   9: export const PORT_LATENCY_MS = 10;
  10: export const ANALYSIS_TIMEOUT_MS = 5000;
  11: export const EXTRACTION_ALERT_MS = 2500;
  12: export const OBSERVER_CYCLE_MS = 1;
  13: export const PEARSON_WINDOW_MS = 100;
  14: 
  15: export const TIMING_CONSTANTS = Object.freeze({
  16:   LOOKAHEAD_MS,
  17:   SCHED_ACCURACY_MS,
  18:   DRIFT_THRESHOLD_QUANTA,
  19:   STARVATION_FRAME_MS,
  20:   BUFFER_NORMAL,
  21:   BUFFER_DEGRADED,
  22:   PORT_BUFFER_SAMPLES,
  23:   PORT_LATENCY_MS,
  24:   ANALYSIS_TIMEOUT_MS,
  25:   EXTRACTION_ALERT_MS,
  26:   OBSERVER_CYCLE_MS,
  27: });
```

## File: packages/core/src/constants/scoring.ts
Lines: 21
SHA256: C22D35117E3E249306BD047FB6FD0EF43774318E09FF8B6BF3A38CEB4A2A17FF
```typescript
   1: // OTOMIX §4.3 (ENERGY_WEIGHTS)
   2: // OTOMIX §4.5 (MIX_WEIGHTS, UNMIXABLE_BELOW)
   3: // OTOMIX §4.4 (VOCAL_THRESHOLD, VOCAL_MEDIAN_S)
   4: // OTOMIX §4.9 (RECO_WEIGHTS, TEMPO_DELTA_LIMIT)
   5: export const ENERGY_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
   6: export const MIX_WEIGHTS = Object.freeze([0.4, 0.3, 0.2, 0.1] as const);
   7: export const UNMIXABLE_BELOW = 0.4;
   8: export const VOCAL_THRESHOLD = 0.65;
   9: export const VOCAL_MEDIAN_S = 1;
  10: export const RECO_WEIGHTS = Object.freeze([0.6, 0.3, 0.1] as const);
  11: export const TEMPO_DELTA_LIMIT = 0.01;
  12: 
  13: export const SCORING_CONSTANTS = Object.freeze({
  14:   ENERGY_WEIGHTS,
  15:   MIX_WEIGHTS,
  16:   UNMIXABLE_BELOW,
  17:   VOCAL_THRESHOLD,
  18:   VOCAL_MEDIAN_S,
  19:   RECO_WEIGHTS,
  20:   TEMPO_DELTA_LIMIT,
  21: });
```

