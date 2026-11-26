import type { Pool } from 'pg';
import type { TenantId } from '@otomix/db';
import { BaseRepository } from './base-repository.js';

export interface TrackRow {
  track_id: string;
  tenant_id: string;
  duration_ms: number;
  owner_id: string;
}

export class TrackRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async findByTrackId(
    tenantId: TenantId,
    trackId: string
  ): Promise<TrackRow | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query<TrackRow>(
        `SELECT track_id, tenant_id, duration_ms, owner_id
           FROM tracks
          WHERE tenant_id = current_setting('app.tenant_id', true)
            AND track_id = $1
            AND duration_ms IS NOT NULL
            AND duration_ms > 0
          LIMIT 1`,
        [trackId]
      );
      return result.rows[0] ?? null;
    });
  }
}
