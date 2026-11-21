export type ComponentKey = 'mixability' | 'camelot' | 'tempo' | 'energy';

export interface ComponentScores {
  mixability: number;
  camelot: number;
  tempo: number;
  energy: number;
}

export const DEFAULT_WEIGHTS: Record<ComponentKey, number> = {
  mixability: 0.60,
  camelot: 0.30,
  tempo: 0.10,
  energy: 0,
};

export const MIN_TEMPO_DELTA_PERCENT = 2;
export const MAX_TEMPO_DELTA_PERCENT = 20;
export const DEFAULT_TEMPO_DELTA_PERCENT = 10;

export function clampTempoDeltaPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TEMPO_DELTA_PERCENT;
  return Math.max(MIN_TEMPO_DELTA_PERCENT, Math.min(MAX_TEMPO_DELTA_PERCENT, value));
}

export function tempoWithinLimit(
  fromBpm: number,
  toBpm: number,
  limitPercent = DEFAULT_TEMPO_DELTA_PERCENT,
): boolean {
  if (!Number.isFinite(fromBpm) || !Number.isFinite(toBpm) || fromBpm <= 0 || toBpm <= 0) {
    return false;
  }
  const limit = clampTempoDeltaPercent(limitPercent);
  return Math.abs(fromBpm - toBpm) / fromBpm * 100 <= limit;
}

export function combineScores(
  scores: ComponentScores,
  weights: Record<ComponentKey, number> = DEFAULT_WEIGHTS,
): number {
  return (
    scores.mixability * weights.mixability +
    scores.camelot * weights.camelot +
    scores.tempo * weights.tempo +
    scores.energy * weights.energy
  );
}