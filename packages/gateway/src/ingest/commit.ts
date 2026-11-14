// OTOMIX 5.1; 9.5; 9.9 - Mother 1; Add. 1-2 - GAP-014; GAP-017
// M03: single-transaction commit of track + features + outbox.
// Placeholder feature values per [GAP-023]; real extraction is P05-T04-S01-M01.

import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { upsertTrackDedup } from './dedup.js';

export interface CommitIngestData {
  tenantId: string;
  ownerId: string;
  contentSha256: Uint8Array;
  format: string;
  durationMs: number;
  storageKey: string;
}

export interface CommitIngestDeps {
  failAfterTrackInsert?: boolean;
}

const PLACEHOLDER_SCHEMA_VERSION = '1.2.0';

export async function commitIngestTransaction(
  client: PoolClient,
  data: CommitIngestData,
  deps: CommitIngestDeps = {},
): Promise<string> {
  const { trackId, isNew } = await upsertTrackDedup(
    client,
    data.tenantId,
    data.ownerId,
    data.contentSha256,
    data.format,
    data.durationMs,
    data.storageKey,
  );

  if (deps.failAfterTrackInsert) {
    throw new Error('TEST:forced_failure_after_track_insert');
  }

  if (isNew) {
    const featureId = randomUUID();
    await client.query(
      `INSERT INTO features (
         feature_id, tenant_id, track_id, schema_version,
         bpm, camelot_key, energy_scalar, energy_stars,
         mixability, groove_mode, registry_json
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        featureId,
        data.tenantId,
        trackId,
        PLACEHOLDER_SCHEMA_VERSION,
        120,
        '1A',
        0.5,
        3,
        0.5,
        'straight',
        JSON.stringify({}),
      ],
    );
  }

  const messageId = randomUUID();
  const payload = JSON.stringify({
    track_id: trackId,
    schema_version: PLACEHOLDER_SCHEMA_VERSION,
    is_new: isNew,
  });
  await client.query(
    `INSERT INTO outbox (message_id, tenant_id, topic, payload)
     VALUES ($1, $2, $3, $4)`,
    [messageId, data.tenantId, 'otomix.track.ingested', payload],
  );

  return trackId;
}