export type ComponentKey = 'mixability' | 'camelot' | 'tempo' | 'energy';

export interface ComponentScores {
  mixability: number;
  camelot: number;
  tempo: number;
  energy: number;
}

export const DEFAULT_WEIGHTS: Record<ComponentKey, number> = {
  mixability: 0.4,
  camelot: 0.3,
  tempo: 0.2,
  energy: 0.1,
};

export function combineScores(
  scores: ComponentScores,
  weights: Record<ComponentKey, number> = DEFAULT_WEIGHTS
): number {
  return (
    scores.mixability * weights.mixability +
    scores.camelot * weights.camelot +
    scores.tempo * weights.tempo +
    scores.energy * weights.energy
  );
}
