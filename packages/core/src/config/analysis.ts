import defaultConfig from './analysis-config.json';

export interface EnergyConfig {
  weights: Record<string, number>;
  maxValues: Record<string, number>;
}

export interface MixabilityConfig {
  weights: Record<string, number>;
  kickDriftToleranceMs: number;
}

export interface CompatibilityConfig {
  weights: Record<string, number>;
}

export interface AnalysisConfig {
  normalization: {
    forceMono: boolean;
    targetSampleRate: number;
  };
  energy: EnergyConfig;
  mixability: MixabilityConfig;
  camelot: {
    strictMode: boolean;
  };
  compatibility: CompatibilityConfig;
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