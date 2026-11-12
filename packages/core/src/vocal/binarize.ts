// OTOMIX §4.4 · Vocal Binarization (P05-T03-S01-M01)
//
// Rule 25: Preference feature (never a gate).
// Rule 26: Dimensionless score.
//
// Binarizes vocal probabilities. V_map[t] = 1 only when the
// probability is strictly greater than the threshold (default 0.65).

export function binarizeVocalMap(
  probabilities: readonly number[],
  threshold: number = 0.65
): number[] {
  return probabilities.map(p => (p > threshold ? 1 : 0));
}