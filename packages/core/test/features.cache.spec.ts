import { describe, it, expect, vi } from 'vitest';
import { makeCacheInvalidator, purgeOlderMajorVersions } from '../src/features/cache-invalidate';
import type { GlobalFeaturesRepository } from '../src/repository/global-features';

describe('Cache Invalidation (P05-T02-S03-M02)', () => {
  it('T1: purge on major version bump', async () => {
    const mockRepo = {
      deleteVersionsOlderThanMajor: vi.fn().mockResolvedValue(['hash1', 'hash2'])
    } as unknown as GlobalFeaturesRepository;
    const invalidator = makeCacheInvalidator(mockRepo);

    const hashes = await purgeOlderMajorVersions(invalidator, '2.0.0');
    
    expect(hashes).toEqual(['hash1', 'hash2']);
    expect(mockRepo.deleteVersionsOlderThanMajor).toHaveBeenCalledWith(2);
  });

  it('T2: minor/patch bump passes the correct major', async () => {
    const mockRepo = {
      deleteVersionsOlderThanMajor: vi.fn().mockResolvedValue([])
    } as unknown as GlobalFeaturesRepository;
    const invalidator = makeCacheInvalidator(mockRepo);

    await purgeOlderMajorVersions(invalidator, '1.2.1');
    // The repository handles the logic: < 1 will not delete 1.2.x
    expect(mockRepo.deleteVersionsOlderThanMajor).toHaveBeenCalledWith(1);
  });

  it('T3: invalid version string throws', async () => {
    const mockRepo = { deleteVersionsOlderThanMajor: vi.fn() } as unknown as GlobalFeaturesRepository;
    const invalidator = makeCacheInvalidator(mockRepo);

    await expect(purgeOlderMajorVersions(invalidator, 'invalid')).rejects.toThrow();
  });
});