import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTenant, type TenantId } from './with-tenant.js';

interface ExtractedFeatures {
  bpm: number;
  camelotKey: string;
  energyScalar: number;
  energyStars: number;
  mixability: number;
  grooveMode: 'straight' | 'triplet' | 'swing';
  registryJson: Record<string, unknown>;
}

export interface GlobalFeatureRecord {
  contentSha256: string;
  rawAnalysisData: Record<string, unknown>;
  analysisVersion: string;
}

export interface PersistExtractedFeaturesInput {
  tenantId: TenantId;
  trackId: string;
  contentSha256: string;
  schemaVersion: string;
  features: ExtractedFeatures;
}

export class FeaturesExtractionRepository {
  constructor(private readonly pool: Pool) {}

  async findGlobal(contentSha256: string): Promise<GlobalFeatureRecord | null> {
    const res = await this.pool.query<GlobalFeatureRecord>(
      `SELECT content_sha256, raw_analysis_data, analysis_version
       FROM global_track_metadata
       WHERE content_sha256 = $1`,
      [contentSha256],
    );
    return res.rows[0] ?? null;
  }

  async upsertGlobal(
    contentSha256: string,
    rawAnalysisData: Record<string, unknown>,
    analysisVersion: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO global_track_metadata (content_sha256, raw_analysis_data, analysis_version)
       VALUES ($1, $2, $3)
       ON CONFLICT (content_sha256) DO UPDATE SET
         raw_analysis_data = EXCLUDED.raw_analysis_data,
         analysis_version = EXCLUDED.analysis_version`,
      [contentSha256, JSON.stringify(rawAnalysisData), analysisVersion],
    );
  }

  async persist(input: PersistExtractedFeaturesInput): Promise<{ featureId: string; messageId: string }> {
    return withTenant(this.pool, input.tenantId, async (client) => {
      const featureResult = await client.query<{ feature_id: string }>(
        `INSERT INTO features (
           feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
           energy_scalar, energy_stars, mixability, groove_mode, registry_json, analysis_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'complete')
         ON CONFLICT (tenant_id, track_id, schema_version) DO UPDATE SET
           bpm = EXCLUDED.bpm,
           camelot_key = EXCLUDED.camelot_key,
           energy_scalar = EXCLUDED.energy_scalar,
           energy_stars = EXCLUDED.energy_stars,
           mixability = EXCLUDED.mixability,
           groove_mode = EXCLUDED.groove_mode,
           registry_json = EXCLUDED.registry_json,
           analysis_status = 'complete',
           analyzed_at = now()
         RETURNING feature_id`,
        [
          randomUUID(), input.tenantId, input.trackId, input.schemaVersion,
          input.features.bpm, input.features.camelotKey, input.features.energyScalar,
          input.features.energyStars, input.features.mixability, input.features.grooveMode,
          JSON.stringify(input.features.registryJson),
        ],
      );
      const featureId = featureResult.rows[0]?.feature_id;
      if (!featureId) throw new Error('Feature upsert returned no feature_id');
      const messageId = randomUUID();
      await client.query(
        'INSERT INTO outbox (message_id, tenant_id, topic, payload) VALUES ($1, $2, $3, $4)',
        [messageId, input.tenantId, 'otomix.feature.extracted', JSON.stringify({
          feature_id: featureId,
          track_id: input.trackId,
          content_sha256: input.contentSha256,
        })],
      );
      return { featureId, messageId };
    });
  }
}