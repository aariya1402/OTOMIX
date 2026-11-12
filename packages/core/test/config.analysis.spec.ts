import { describe, it, expect } from 'vitest';
import { getAnalysisConfig } from '../src/config/analysis';

describe('AdminConfig layer', () => {
  it('loads the default configuration with exact required keys', () => {
    const config = getAnalysisConfig();
    
    // Normalization
    expect(config.normalization.forceMono).toBe(false);
    expect(config.normalization.targetSampleRate).toBe(44100);
    
    // Energy
    expect(config.energy.weights.danceability).toBe(0.30);
    expect(config.energy.maxValues.danceability).toBe(3.0);
    
    // Mixability
    expect(config.mixability.weights.kick_drift_absence).toBe(0.30);
    expect(config.mixability.kickDriftToleranceMs).toBe(4.0);
    
    // Camelot
    expect(config.camelot.strictMode).toBe(true);
    
    // Compatibility
    expect(config.compatibility.weights.mixability).toBe(0.40);
    
    // Transition
    expect(config.transition.defaultWindowBars).toBe(16);
  });
});