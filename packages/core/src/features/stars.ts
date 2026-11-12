// OTOMIX §4.3 · Energy Stars Mapping (P05-T02-S02-M04)
// Rule 25: PREFERENCE feature, stars for UI ranking — not a gate.
// Rule 26: Dimensionless score; no time units.
// D9: All band thresholds from AnalysisConfig; no hardcoded tunables.

export interface StarsBand {
  readonly min: number;
  readonly stars: number;
}

export interface StarsConfig {
  readonly bands: readonly StarsBand[];
}

export function computeStars(raw: number, cfg: StarsConfig): number {
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 1;
  for (const band of cfg.bands) {
    if (raw >= band.min) return band.stars;
  }
  return 1;
}