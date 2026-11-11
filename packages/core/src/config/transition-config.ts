/**
 * High-level parameters controlled by the end-user (DJ) in the UI.
 * These affect the macro flow of the set.
 */
export interface UserFacingConfig {
  entryBeat: number;
  exitBeat: number;
  transitionWindowBars: number; // e.g., 4, 8, 16
  bpmTolerance: number;         // e.g., 0.10 (10%)
  targetEnergy: number;         // 0.0 to 1.0
}

/**
 * Deep DSP parameters controlled by administrators for quality tuning.
 * End-users CANNOT change these.
 */
export interface AdminTuningConfig {
  chopGrid: number;          // e.g., 8, 16, 32
  crossfadeBeats: number;    // e.g., 0.015625 (1/64 beat)
  rateMin: number;           // e.g., 0.98
  rateMax: number;           // e.g., 1.02
  swingThreshold: number;    // e.g., 0.05
}

/**
 * The final merged configuration passed to the DSP layer.
 */
export interface DspEngineConfig {
  adminConfig: AdminTuningConfig;
  userConfig: UserFacingConfig;
}