// OTOMIX §4.3 · Energy Formula (9 Factors)
// Rule 25: PREFERENCE feature, not a gate.
// Rule 26: Dimensionless score; no time units.
// D9: All weights/caps from AnalysisConfig.

import { getAnalysisConfig } from '../config/analysis';
import { computeStars } from './stars';

export interface EnergyFeaturesInput {
  readonly danceability?: number;
  readonly onset_rate?: number;
  readonly rms_energy?: number;
  readonly average_loudness?: number;
  readonly dynamic_complexity?: number;
  readonly spectral_centroid?: number;
  readonly beats_loudness_band_ratio?: readonly number[];
  readonly kick_strength?: number;
  readonly spectral_density?: number;
  readonly loudness_range?: number;
}

export interface EnergyResult {
  readonly raw: number;
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
  const rms_energy = features.rms_energy !== undefined
    ? normCap(features.rms_energy, max.rms_energy)
    : (features.average_loudness !== undefined ? clamp01(features.average_loudness) : 0);
  const dc = features.dynamic_complexity;
  const dynamic_inverse = (typeof dc === 'number' && Number.isFinite(dc) && max.dynamic_complexity > 0)
    ? clamp01((max.dynamic_complexity - dc) / max.dynamic_complexity) : 0;
  const spectral_centroid = normCap(features.spectral_centroid, max.spectral_centroid);
  const bbr = features.beats_loudness_band_ratio;
  const beat_bass_ratio = (Array.isArray(bbr) && bbr.length >= 2)
    ? clamp01(((bbr[0] ?? 0) + (bbr[1] ?? 0)) / 2) : 0;

  const kick_strength = normCap(features.kick_strength, max.kick_strength);
  const spectral_density = normCap(features.spectral_density, max.spectral_density);
  const loudness_range = normCap(features.loudness_range, max.loudness_range);

  const raw =
    w.danceability * danceability +
    w.onset_rate * onset_rate +
    w.rms_energy * rms_energy +
    w.dynamic_inverse * dynamic_inverse +
    w.spectral_centroid * spectral_centroid +
    w.beat_bass_ratio * beat_bass_ratio +
    w.kick_strength * kick_strength +
    w.spectral_density * spectral_density +
    w.loudness_range * loudness_range;

  const clampedRaw = clamp01(raw);
  return {
    raw: clampedRaw,
    stars: computeStars(clampedRaw, cfg.energy.stars),
  };
}