import { Pool } from 'pg';
import { BaseRepository } from './base-repository';
import { TenantId } from '@otomix/db';

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
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query<FeatureRow>(
        'SELECT * FROM features ORDER BY feature_id DESC'
      );
      return result.rows;
    });
  }
}