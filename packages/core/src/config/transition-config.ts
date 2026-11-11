/**
 * High-level parameters controlled by the end-user (DJ) in the UI.
 * These affect the macro flow of the set.
 */
export interface UserFacingConfig {
  entryBeat: number;
  exitBeat: number;
  bpmTolerance: number;         // e.g., 0.10 (10%)
  targetEnergy: number;         // 0.0 to 1.0
  profileId: string;            // ID of the chosen TransitionProfile
}

export interface EqBandConfig {
  frequency: number;
  gainDb: number;
  q: number;
}

export interface EqProfile {
  low: EqBandConfig;
  mid: EqBandConfig;
  high: EqBandConfig;
}

export type BpmCurveType = 'linear' | 'exponential' | 'cosine';

export interface TransitionProfile {
  id: string;
  name: string;
  windowBars: number;           // e.g., 4, 8, 16
  bpmCurve: BpmCurveType;
  eqProfile: EqProfile;
  effects: string[];            // e.g., ['reverb', 'delay']
  // Future expansion for automation curves of each parameter over the window
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
  transitionProfile: TransitionProfile;
}