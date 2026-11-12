// OTOMIX §4.3 · Owner decisions D2, D9 (2026-11-12)
//
// Multi-dimensional energy. Composite of 6 weighted factors whose
// normalized values are [0,1]. All weights and caps come from
// AnalysisConfig — NO hardcoded tunables in this file (D9).
//
// Skeleton scope (this task):
//   - Real computation from the 6 factors already in AdminConfig.
//   - Percentile → stars mapping is deferred to P05-ADD-T02-S02-M04.
//   - True polyphony detection (spectral density beyond onset_rate)
//     is deferred; onset_rate is used as the rhythmic-density proxy.
//
// Rule 25: energy is a PREFERENCE feature (ranking), not a gate.
// Rule 26: energy is a dimensionless score; no time units.
//
// Input shape is a minimal structural interface so this module can
// accept ExtractedFeatures from @otomix/adapter without importing it
// (avoids a circular package dependency).

import { getAnalysisConfig } from '../config/analysis';

export interface EnergyFeaturesInput {
  readonly danceability?: number;
  readonly onset_rate?: number;
  /** Essentia RMS energy (typical range 0..0.2). Preferred when present. */
  readonly rms_energy?: number;
  /** Essentia average_loudness (0..1, already normalized). Used as
   *  a fallback proxy for rms_energy when the raw value is absent. */
  readonly average_loudness?: number;
  readonly dynamic_complexity?: number;
  readonly spectral_centroid?: number;
  readonly beats_loudness_band_ratio?: readonly number[];
}

export interface EnergyResult {
  /** Weighted composite in [0, 1]. */
  readonly raw: number;
  /** 1–5 star percentile band. Stub returns 0 pending task M04. */
  readonly stars: number;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function normCap(v: number | undefined, cap: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || cap <= 0) return 0;
  return clamp01(v / cap);
}

export function computeEnergy(features: EnergyFeaturesInput): EnergyResult {
  const cfg = getAnalysisConfig();
  const w = cfg.energy.weights;
  const max = cfg.energy.maxValues;

  const danceability = normCap(features.danceability, max.danceability);
  const onset_rate = normCap(features.onset_rate, max.onset_rate);

  // rms_energy: prefer the explicit 0..0.2 range; fall back to
  // average_loudness (0..1) as proxy — flagged for refinement in
  // the follow-up algorithm task.
  const rms_energy =
    features.rms_energy !== undefined
      ? normCap(features.rms_energy, max.rms_energy)
      : features.average_loudness !== undefined
        ? clamp01(features.average_loudness)
        : 0;

  // dynamic_inverse: lower dynamic_complexity = higher perceived energy.
  const dc = features.dynamic_complexity;
  const dynamic_inverse =
    typeof dc === 'number' && Number.isFinite(dc) && max.dynamic_complexity > 0
      ? clamp01((max.dynamic_complexity - dc) / max.dynamic_complexity)
      : 0;

  const spectral_centroid = normCap(features.spectral_centroid, max.spectral_centroid);

  // beat_bass_ratio: mean of the two lowest bands from
  // beats_loudness_band_ratio (kick + sub-bass).
  const bbr = features.beats_loudness_band_ratio;
  const beat_bass_ratio =
    Array.isArray(bbr) && bbr.length >= 2
      ? clamp01(((bbr[0] ?? 0) + (bbr[1] ?? 0)) / 2)
      : 0;

  const raw =
    w.danceability * danceability +
    w.onset_rate * onset_rate +
    w.rms_energy * rms_energy +
    w.dynamic_inverse * dynamic_inverse +
    w.spectral_centroid * spectral_centroid +
    w.beat_bass_ratio * beat_bass_ratio;

  return {
    raw: clamp01(raw),
    // TODO(P05-ADD-T02-S02-M04): percentile-rank → 1..5 stars.
    stars: 0,
  };
}