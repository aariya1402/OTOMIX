import { describe, expect, it } from 'vitest';
import { TrackRepository } from '../src/repository/track-repository.js';
import type { Pool, PoolClient } from 'pg';

function mockPool(row: unknown): Pool {
  const client = {
    query: async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (typeof sql === 'string' && sql.includes('SET')) return { rows: [] };
      if (typeof sql === 'string' && sql.includes('SELECT track_id')) {
        return { rows: row ? [row] : [] };
      }
      return { rows: [] };
    },
    release: () => {},
  } as unknown as PoolClient;
  return {
    connect: async () => client,
  } as unknown as Pool;
}

describe('TrackRepository', () => {
  it('returns a positive-duration row for the existing tenant and track', async () => {
    const repo = new TrackRepository(mockPool({
      track_id: 'track-a',
      tenant_id: 'otomix',
      duration_ms: 180000,
      owner_id: 'owner-a',
    }));
    await expect(repo.findByTrackId('otomix', 'track-a')).resolves.toEqual({
      track_id: 'track-a',
      tenant_id: 'otomix',
      duration_ms: 180000,
      owner_id: 'owner-a',
    });
  });

  it('returns null for missing track', async () => {
    const repo = new TrackRepository(mockPool(null));
    await expect(repo.findByTrackId('otomix', 'missing')).resolves.toBeNull();
  });

  it('returns null for wrong tenant', async () => {
    const repo = new TrackRepository(mockPool(null));
    await expect(repo.findByTrackId('otodj', 'track-a')).resolves.toBeNull();
  });

  it('returns null for zero duration', async () => {
    const repo = new TrackRepository(mockPool(null));
    await expect(repo.findByTrackId('otomix', 'zero-duration')).resolves.toBeNull();
  });
});
