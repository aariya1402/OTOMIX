// OTOMIX 5.1; 9.5; 9.9 - Mother 1; Add. 1-2 - GAP-014; GAP-017; GAP-023; GAP-030
// M03: single-transaction commit of track + outbox.
// Feature insertion moved to async enrichment (GATE0-P05-M07 / GAP-023 / GAP-030).
// This function only commits track + declarations + track.ingested outbox event.

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
    await client.query(
      `INSERT INTO features (
         feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
         energy_scalar, energy_stars, mixability, groove_mode, registry_json,
         analysis_status
       ) VALUES (
         gen_random_uuid(), $1, $2, '1.2.0', 120, '1A',
         0, 0, 0, 'straight', '{}'::jsonb, 'placeholder'
       )`,
      [data.tenantId, trackId],
    );
  }

  const messageId = randomUUID();
  const payload = JSON.stringify({
    track_id: trackId,
    is_new: isNew,
  });
  await client.query(
    `INSERT INTO outbox (message_id, tenant_id, topic, payload)
     VALUES ($1, $2, $3, $4)`,
    [messageId, data.tenantId, 'otomix.track.ingested', payload],
  );

  return trackId;
}