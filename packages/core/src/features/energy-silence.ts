// OTOMIX §4.3 · Silence Detection (P05-T02-S02-M02)
//
// Returns E=0 and stars=0 for totally silent structural blocks.
// Checkpoint: Silence is detected BEFORE normalization.

export interface SilenceFeaturesInput {
  readonly rms_energy?: number;
  readonly average_loudness?: number;
}

export interface SilenceResult {
  readonly E: number;
  readonly stars: number;
}

export function isSilentBlock(features: SilenceFeaturesInput): boolean {
  const rms = features.rms_energy ?? 0;
  const loudness = features.average_loudness ?? 0;
  return rms === 0 && loudness === 0;
}

export function getSilentEnergy(): SilenceResult {
  return { E: 0, stars: 0 };
}