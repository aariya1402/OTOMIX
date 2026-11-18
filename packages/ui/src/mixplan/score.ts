export type ComponentKey = 'mixability' | 'camelot' | 'tempo' | 'energy';

export interface ComponentScores {
  mixability: number;
  camelot: number;
  tempo: number;
  energy: number;
}

export const DEFAULT_WEIGHTS: Record<ComponentKey, number> = {
  mixability: 0.40,
  camelot: 0.30,
  tempo: 0.20,
  energy: 0.10,
};

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