// OTOMIX §4.2 · Cache Invalidation (P05-T02-S03-M02)
// Rule 25: Cache is for performance, not gating.
// D9: No hardcoded tunables; currentVersion is a parameter.

export interface GlobalFeaturesStore {
  deleteVersionsOlderThanMajor(major: number): Promise<string[]>;
}

export interface CacheInvalidator {
  repository: GlobalFeaturesStore;
}

export function makeCacheInvalidator(repository: GlobalFeaturesStore): CacheInvalidator {
  return { repository };
}

export async function purgeOlderMajorVersions(
  invalidator: CacheInvalidator,
  currentVersion: string,
): Promise<string[]> {
  const currentMajor = Number(currentVersion.split('.')[0]);
  if (!Number.isFinite(currentMajor)) {
    throw new Error(`Invalid analysis version: ${currentVersion}`);
  }

  const purgedHashes = await invalidator.repository.deleteVersionsOlderThanMajor(currentMajor);
  return purgedHashes;
}