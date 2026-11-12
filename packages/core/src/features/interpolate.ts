// OTOMIX §4.2, §4.6 · Missing Feature Interpolation (P05-T02-S03-M01)
//
// Interpolates missing features with the global dataset median for the
// dominant genre and lists them in `interpolated_fields`.
//
// Rule 25: Preference feature, no gating.
// Rule 26: No time units.
// D9: Medians are injected, never hardcoded.
//
// Note: We use a local structural interface (FeatureMap) to avoid
// importing @otomix/adapter (which would create a circular dependency).

export type FeatureMap = Record<string, number | number[] | undefined>;

export interface InterpolateOptions {
  readonly genre: string;
  readonly medians: Record<string, Record<string, number>>;
}

export interface InterpolateResult<T extends FeatureMap> {
  readonly features: T;
  readonly interpolated_fields: string[];
}

export function interpolateMissingFeatures<T extends FeatureMap>(
  features: T,
  options: InterpolateOptions
): InterpolateResult<T> {
  const genreMedians = options.medians[options.genre];
  
  // If the genre is not in the medians table, nothing to interpolate.
  if (!genreMedians) {
    return { features: { ...features }, interpolated_fields: [] };
  }

  const filled: FeatureMap = { ...features };
  const interpolated_fields: string[] = [];

  for (const [key, medianValue] of Object.entries(genreMedians)) {
    const current = features[key];
    
    // Treat undefined or non-finite numbers as missing.
    const isMissing = current === undefined ||
      (typeof current === 'number' && !Number.isFinite(current));
    
    if (isMissing) {
      filled[key] = medianValue;
      interpolated_fields.push(key);
    }
  }

  return { features: filled as T, interpolated_fields };
}