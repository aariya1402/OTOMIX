// OTOMIX §4.1 · Global Track Metadata Repository (AI Agent.MD §6)
//
// Cross-tenant feature cache. Does not use withTenant because it is
// intentionally global (keyed by audio content SHA-256).
//
// Rule 26: No time-based musical identifiers.

import { Pool } from 'pg';

export interface GlobalFeatureRecord {
  readonly contentSha256: string;
  readonly rawAnalysisData: Record<string, unknown>;
  readonly analysisVersion: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class GlobalFeaturesRepository {
  constructor(private readonly pool: Pool) {}

  public async upsertFeature(
    contentSha256: string,
    data: Record<string, unknown>,
    version: string,
  ): Promise<void> {
    const query = `
      INSERT INTO global_track_metadata (content_sha256, raw_analysis_data, analysis_version)
      VALUES ($1, $2, $3)
      ON CONFLICT (content_sha256) DO UPDATE SET
        raw_analysis_data = EXCLUDED.raw_analysis_data,
        analysis_version = EXCLUDED.analysis_version,
        updated_at = now()
    `;
    await this.pool.query(query, [contentSha256, JSON.stringify(data), version]);
  }

  public async getFeature(contentSha256: string): Promise<GlobalFeatureRecord | null> {
    const query = `
      SELECT content_sha256, raw_analysis_data, analysis_version, created_at, updated_at
      FROM global_track_metadata
      WHERE content_sha256 = $1
    `;
    const result = await this.pool.query(query, [contentSha256]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      contentSha256: row.content_sha256,
      rawAnalysisData: row.raw_analysis_data,
      analysisVersion: row.analysis_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}