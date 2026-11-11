export interface UserFacingConfig {
  entryBeat: number;
  exitBeat: number;
  bpmTolerance: number;
  targetEnergy: number;
  profileId: string;
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

export interface CompressorBandConfig {
  frequency: number; // Hz crossover point
}

export interface CompressorProfile {
  thresholdDb: number;
  ratio: number;
  attackBeats: number;
  releaseBeats: number;
  kneeDb: number;
  makeupGainDb: number;
  lowCrossover: CompressorBandConfig;
  highCrossover: CompressorBandConfig;
}

export type BpmCurveType = 'linear' | 'exponential' | 'cosine';

export interface TransitionProfile {
  id: string;
  name: string;
  windowBars: number;
  bpmCurve: BpmCurveType;
  eqProfile: EqProfile;
  compressor: CompressorProfile;
  effects: string[];
}

export interface AdminTuningConfig {
  enableLiveEffects: boolean;
  chopGrid: number;
  crossfadeBeats: number;
  rateMin: number;
  rateMax: number;
  swingThreshold: number;
}

export interface DspEngineConfig {
  adminConfig: AdminTuningConfig;
  userConfig: UserFacingConfig;
  transitionProfile: TransitionProfile;
}