// OTOMIX 4.4; 4.7 - Mother 3.4; Add. 10 - GOTCHA-005; DEFERRED-001
// Fallback when the TensorFlow voice_instrumental model fails to load or crashes.
// Returns a zeroed vocal map and marks that fact on the result.
// TF_DEFERRED: real TF inference is deferred; callers must propagate the flag.

export interface VocalFallbackResult {
  vMap: Float32Array;
  vocalMapAssumedZero: boolean;
  reason: string;
}

export function buildZeroVocalMap(frames: number, reason: string): VocalFallbackResult {
  if (frames < 0) throw new Error('frames must be >= 0');
  const vMap = new Float32Array(frames);
  return {
    vMap,
    vocalMapAssumedZero: true,
    reason,
  };
}

export function tryBuildVocalMap(
  frames: number,
  loader: () => Promise<Float32Array>,
): Promise<VocalFallbackResult> {
  return loader()
    .then((vMap) => ({
      vMap,
      vocalMapAssumedZero: false,
      reason: 'ok',
    }))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return buildZeroVocalMap(frames, msg);
    });
}