import { describe, it, expect } from 'vitest';
import { isBpmDynamic } from '../src/features/bpm-seed';
import { getAnalysisConfig } from '../src/config/analysis';

type TempoConfigWithDynamicThreshold = ReturnType<typeof getAnalysisConfig>['tempo'] & {
  bpmDynamicThresholdBpm?: number;
};

describe('isBpmDynamic (P05-T02-S01-M02)', () => {
  it('returns false for a static BPM histogram', () => {
    const hist = [
      { bpm: 120, weight: 1 },
      { bpm: 120.5, weight: 2 },
      { bpm: 120.1, weight: 1 }
    ];
    expect(isBpmDynamic(hist)).toBe(false);
  });

  it('returns true for a dynamic BPM histogram', () => {
    const hist = [
      { bpm: 120, weight: 1 },
      { bpm: 125, weight: 2 },
      { bpm: 118, weight: 1 }
    ];
    expect(isBpmDynamic(hist)).toBe(true);
  });

  it('returns false for an empty histogram', () => {
    expect(isBpmDynamic([])).toBe(false);
  });

  it('uses the configured BPM spread threshold', () => {
    const tempo = getAnalysisConfig().tempo as TempoConfigWithDynamicThreshold;
    expect(tempo.bpmDynamicThresholdBpm).toBe(2.0);
  });

  it('respects a configured zero BPM spread threshold', () => {
    const tempo = getAnalysisConfig().tempo as TempoConfigWithDynamicThreshold;
    const previousThreshold = tempo.bpmDynamicThresholdBpm;
    tempo.bpmDynamicThresholdBpm = 0;

    try {
      expect(isBpmDynamic([
        { bpm: 120, weight: 1 },
        { bpm: 121, weight: 1 },
      ])).toBe(true);
    } finally {
      if (previousThreshold === undefined) {
        delete tempo.bpmDynamicThresholdBpm;
      } else {
        tempo.bpmDynamicThresholdBpm = previousThreshold;
      }
    }
  });
});