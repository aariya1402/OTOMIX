// OTOMIX 4.8; 9.5 - Mother 7; Add. 1-2
// extract(): adapter -> registry fields -> validate -> features + outbox in one transaction.

import type { Pool } from 'pg';
import { withTenant } from '@otomix/db';
import type { Logger } from '../telemetry/logger.js';

export type TenantId = 'otomix' | 'otodj';

export interface ExtractedFeatures {
  bpm: number;
  camelotKey: string;
  energyScalar: number;
  energyStars: number;
  mixability: number;
  grooveMode: 'straight' | 'triplet' | 'swing';
  registryJson: Record<string, unknown>;
}

export interface ExtractRawInput {
  trackId: string;
  contentSha256: string;
  schemaVersion: string;
  rawAnalysis: unknown;
}

export interface ExtractDeps {
  pool: Pool;
  tenantId: TenantId;
  adapter: (raw: unknown) => Promise<ExtractedFeatures>;
  validator: (f: ExtractedFeatures) => { valid: boolean; error?: string };
  logger?: Logger;
  onBeforeOutboxInsert?: (input: ExtractRawInput) => Promise<void>;
}

export interface ExtractResult {
  ok: boolean;
  featureId?: string;
  messageId?: string;
  error?: string;
}

export interface ExtractBatchResult {
  succeeded: number;
  failed: number;
  results: ExtractResult[];
}

export async function extractOne(
  input: ExtractRawInput,
  deps: ExtractDeps
): Promise<ExtractResult> {
  let features: ExtractedFeatures;
  try {
    features = await deps.adapter(input.rawAnalysis);
  } catch (err) {
    return { ok: false, error: 'ADAPTER: ' + (err as Error).message };
  }
  const v = deps.validator(features);
  if (!v.valid) {
    return { ok: false, error: 'INVALID: ' + (v.error ?? 'unknown') };
  }

  try {
    return await withTenant(deps.pool, deps.tenantId, async (client) => {
      const fr = await client.query(
        'INSERT INTO features ' +
          '(feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, ' +
          ' energy_scalar, energy_stars, mixability, groove_mode, registry_json) ' +
          'VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ' +
          'RETURNING feature_id',
        [
          deps.tenantId,
          input.trackId,
          input.schemaVersion,
          features.bpm,
          features.camelotKey,
          features.energyScalar,
          features.energyStars,
          features.mixability,
          features.grooveMode,
          JSON.stringify(features.registryJson),
        ]
      );
      const featureId = fr.rows[0].feature_id as string;

      if (deps.onBeforeOutboxInsert) {
        await deps.onBeforeOutboxInsert(input);
      }

      const mr = await client.query(
        'INSERT INTO outbox (message_id, tenant_id, topic, payload) ' +
          'VALUES (gen_random_uuid(), $1, $2, $3) RETURNING message_id',
        [
          deps.tenantId,
          'otomix.feature.extracted',
          JSON.stringify({
            feature_id: featureId,
            track_id: input.trackId,
            content_sha256: input.contentSha256,
          }),
        ]
      );
      const messageId = mr.rows[0].message_id as string;

      return { ok: true, featureId, messageId };
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function extract(
  inputs: ExtractRawInput[],
  deps: ExtractDeps
): Promise<ExtractBatchResult> {
  let succeeded = 0,
    failed = 0;
  const results: ExtractResult[] = [];
  for (const input of inputs) {
    const r = await extractOne(input, deps);
    results.push(r);
    if (r.ok) succeeded++;
    else failed++;
  }
  return { succeeded, failed, results };
}
