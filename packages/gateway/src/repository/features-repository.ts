import type { Pool } from 'pg';
import { BaseRepository } from './base-repository.js';
import type { TenantId } from '@otomix/db';

export interface FeatureRow {
  feature_id: string;
  tenant_id: string;
  track_id: string;
  schema_version: string;
  bpm: number;
  camelot_key: string;
  energy_scalar: number;
  energy_stars: number;
  mixability: number;
  groove_mode: string;
  registry_json: object;
}

export class FeaturesRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async findAll(tenantId: TenantId): Promise<FeatureRow[]> {
    return this.withTenant(tenantId as TenantId, async (client) => {
      const result = await client.query<FeatureRow>(
        'SELECT * FROM features ORDER BY feature_id DESC'
      );
      return result.rows;
    });
  }

  async findPaginated(
    tenantId: TenantId,
    cursor: { analyzed_at: string; feature_id: string } | null,
    limit: number
  ): Promise<{ items: any[]; nextCursor: { analyzed_at: string; feature_id: string } | null }> {
    return this.withTenant(tenantId as TenantId, async (client) => {
      const res = await client.query(
        `
        SELECT feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
               energy_scalar, energy_stars, mixability, groove_mode, registry_json, analyzed_at
        FROM features
        WHERE tenant_id = current_setting('app.tenant_id', true)
          AND ($1::timestamptz IS NULL OR analyzed_at > $1 OR (analyzed_at = $1 AND feature_id > $2))
        ORDER BY analyzed_at ASC, feature_id ASC
        LIMIT $3
        `,
        [cursor?.analyzed_at || null, cursor?.feature_id || null, limit + 1]
      );

      const hasMore = res.rows.length > limit;
      const items = hasMore ? res.rows.slice(0, limit) : res.rows;
      let nextCursor = null;
      if (hasMore && items.length > 0) {
        const last = items[items.length - 1];
        nextCursor = {
          analyzed_at: last.analyzed_at.toISOString(),
          feature_id: last.feature_id,
        };
      }
      return { items, nextCursor };
    });
  }
}
