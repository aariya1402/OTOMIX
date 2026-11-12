import defaultConfig from './analysis-config.json' with { type: 'json' };

export interface EnergyConfig {
  weights: Record<string, number>;
  maxValues: Record<string, number>;
  stars: { bands: Array<{ min: number; stars: number }> };
}

export interface MixabilityConfig {
  weights: Record<string, number>;
  kickDriftToleranceBeats: number;
}

export interface CompatibilityConfig {
  weights: Record<string, number>;
}


export interface TempoConfig {
  k: number;
  maxIterations: number;
  epsilon: number;
  peakStrengthThreshold: number;
  peakToleranceBpm: number;
}

export interface AnalysisConfig {
  timeouts: {
    extractionAlertMs: number;
  };
  normalization: {
    forceMono: boolean;
    targetSampleRate: number;
  };
  energy: EnergyConfig;
  mixability: MixabilityConfig;
  camelot: {
    strictMode: boolean;
  };
  grid: {
    lockToleranceBeats: number;
  };
  compatibility: CompatibilityConfig;
  tempo: TempoConfig;
  transition: {
    defaultWindowBars: number;
  };
}

/**
 * Returns the active AnalysisConfig.
 * In a future phase (P06), this will fetch from the Admin Dashboard API.
 * For now, it returns the default JSON config.
 */
export function getAnalysisConfig(): AnalysisConfig {
  return defaultConfig as AnalysisConfig;
}