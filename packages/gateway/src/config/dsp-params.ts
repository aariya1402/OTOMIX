// P06-T07-S01-M01 / D9
// Single source of truth for DSP parameter validation.

export const DSP_PARAMS_CONFIG = Object.freeze({
  allowedChopGrids: ['1/8', '1/16', '1/32'] as const,
  chopGridToDenominator: { '1/8': 8, '1/16': 16, '1/32': 32 } as const,
});

export type ChopGrid = (typeof DSP_PARAMS_CONFIG.allowedChopGrids)[number];

export interface DspParameters {
  chopGrid: ChopGrid;
  crossfadeBeats: number;
}

export function isChopGrid(s: unknown): s is ChopGrid {
  return typeof s === 'string' && (DSP_PARAMS_CONFIG.allowedChopGrids as readonly string[]).indexOf(s) >= 0;
}

export function chopGridDenominator(g: ChopGrid): number {
  return DSP_PARAMS_CONFIG.chopGridToDenominator[g];
}

// OQ-06: crossfadeBeats bound is a pure beat comparison.
// max = (1 / chopGridFraction) / 4 = (1 / denominator) / 4
export function maxCrossfadeBeats(g: ChopGrid): number {
  return (1 / chopGridDenominator(g)) / 4;
}

export function isValidCrossfadeBeats(g: ChopGrid, beats: unknown): boolean {
  if (typeof beats !== 'number') return false;
  if (!Number.isFinite(beats)) return false;
  if (beats <= 0) return false;
  return beats <= maxCrossfadeBeats(g);
}