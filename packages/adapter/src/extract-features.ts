// OTOMIX §4.1 · Owner decisions D9, D11 (2026-11-12)
//
// Extracts 26 non-TF Essentia features from a raw Essentia-shaped output.
// The remaining 5 of the 31 Essentia features are TensorFlow models
// (genre, mood, voice_instrumental, Discogs-EffNet, MAEST). Per D11,
// those are deferred to a later task (final-selected tracks only).
//
// This module is a pure mapper: it accepts raw engine output (unknown)
// and returns a typed ExtractedFeatures shape. It does NOT call Essentia,
// does NOT invoke TensorFlow, and does NOT touch AdminConfig.
//
// Rule 26: `beats_position` and related timing fields are FILE POSITIONS
// (BOUNDARY_IO) per the existing t0_seconds precedent in the registry.
// They are passed through unchanged; no new _S/_MS/*Seconds identifiers.
//
// Pipeline: Essentia engine → extract-features.ts → ExtractedFeatures
//           → map.ts (S02-M01) → FeatureRegistryV1_2 → DB.

export const SUPPORTED_FEATURES = [
  'spectral_density',
  'loudness_range',
  'kick_strength',
  // Rhythm (7)
  'bpm', 'bpm_histogram', 'beats_position', 'onset_rate', 'danceability',
  'beats_loudness', 'beats_loudness_band_ratio',
  // Tonal (6 — chords is a composite bundle)
  'key_temperley', 'key_krumhansl', 'key_edma', 'chords',
  'tuning_frequency', 'hpcp',
  // Low-level (9 — spectral_energyband is a composite bundle)
  'spectral_centroid', 'spectral_spread', 'spectral_skewness', 'spectral_kurtosis',
  'spectral_energyband', 'barkbands', 'melbands', 'erbbands',
  'mfcc', 'spectral_flux', 'dissonance',
  // Loudness (4)
  'loudness_ebu128', 'average_loudness', 'dynamic_complexity', 'silence_rate'
] as const;

// Note: the array has 26 items because `spectral_energyband` is kept as
// a composite and `barkbands`, `melbands`, `erbbands` are listed
// individually (not as one row). The xlsx row count is 31; 5 are TF.

export type SupportedFeature = typeof SUPPORTED_FEATURES[number];

export interface ExtractedFeatures {
  readonly spectral_density?: number;
  readonly loudness_range?: number;
  readonly kick_strength?: number;
  bpm?: number;
  bpm_histogram?: number[];
  /** BOUNDARY_IO: file positions in seconds (Rule 26). */
  beats_position?: number[];
  onset_rate?: number;
  danceability?: number;
  beats_loudness?: number;
  beats_loudness_band_ratio?: number[];
  key_temperley?: number;
  key_krumhansl?: number;
  key_edma?: number;
  chords?: {
    strength?: number;
    histogram?: number[];
    changes_rate?: number;
    key?: string;
  };
  tuning_frequency?: number;
  hpcp?: number[];
  spectral_centroid?: number;
  spectral_spread?: number;
  spectral_skewness?: number;
  spectral_kurtosis?: number;
  spectral_energyband?: { low?: number; middle?: number; high?: number };
  barkbands?: number[];
  melbands?: number[];
  erbbands?: number[];
  mfcc?: number[][];
  spectral_flux?: number[];
  dissonance?: number;
  loudness_ebu128?: number;
  average_loudness?: number;
  dynamic_complexity?: number;
  silence_rate?: number;
}

export function extractFeatures(raw: unknown): ExtractedFeatures {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  const out: ExtractedFeatures = {};
  for (const name of SUPPORTED_FEATURES) {
    if (name in input) {
      (out as Record<string, unknown>)[name] = input[name];
    }
  }
  return out;
}