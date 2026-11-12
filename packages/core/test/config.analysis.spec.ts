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
    expect(config.mixability.weights.kick_grid_lock).toBe(0.25);
    expect(config.mixability.kickDriftToleranceMs).toBe(4.0);
    
    // Camelot
    expect(config.camelot.strictMode).toBe(true);
    expect(config.grid.lockToleranceBeats).toBe(0.05);
    
    // Compatibility
    expect(config.compatibility.weights.mixability).toBe(0.30);
    expect(config.compatibility.weights.camelot_proximity).toBe(0.20);
    expect(config.compatibility.weights.tempo_delta_score).toBe(0.15);
    expect(config.compatibility.weights.grid_type_match).toBe(0.05);
    
    // Transition
    expect(config.transition.defaultWindowBars).toBe(16);
  });
});