// OTOMIX §5.4 · Mother §1 · GAP-014
// Content-hash deduplication. Pure logic, no I/O.
// Checks if a track with the same (tenant_id, owner_id, content_sha256) exists.
// Cloud wrapper in gateway; local wrapper in adapter.

import { randomUUID } from 'node:crypto';
import { createLogger } from '@otomix/core';
import type { Logger, PoolClient } from '@otomix/core';

export interface DedupResult {
  exists: boolean;
  trackId: string | null;
}

export interface DedupDeps {
  logger?: Logger;
  trace_id?: string;
  span_id?: string;
}

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

export async function checkDedup(
  client: PoolClient,
  tenantId: string,
  ownerId: string,
  contentSha256: Uint8Array,
  deps: DedupDeps = {},
): Promise<DedupResult> {
  const logger = deps.logger ?? buildDefaultLogger();
  const traceId = deps.trace_id ?? randomUUID();
  const spanId = deps.span_id ?? randomUUID();

  // Convert Uint8Array to hex string for bytea comparison
  const hashHex = Buffer.from(contentSha256).toString('hex');

  const result = await client.query(
    `SELECT track_id FROM tracks
     WHERE tenant_id = $1 AND owner_id = $2 AND content_sha256 = decode($3, 'hex')
     LIMIT 1`,
    [tenantId, ownerId, hashHex],
  );

  if (result.rows.length > 0) {
    logger.log({
      level: 'info',
      trace_id: traceId,
      span_id: spanId,
      event: 'ingest.dedup_match',
      outcome: 'success',
      durationMs: 0,
      trackId: result.rows[0].track_id,
      tenantId,
      ownerId,
    });
    return { exists: true, trackId: result.rows[0].track_id };
  }

  return { exists: false, trackId: null };
}

export function generateTrackId(): string {
  return randomUUID();
}
export async function upsertTrackDedup(
  client: any,
  tenantId: string,
  ownerId: string,
  contentSha256: Uint8Array,
  format: string,
  durationMs: number,
  storageKey: string
): Promise<{ trackId: string; isNew: boolean }> {
  const res = await client.query(
    `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, owner_id, content_sha256) DO NOTHING
     RETURNING track_id`,
    [tenantId, ownerId, contentSha256, format, durationMs, storageKey]
  );
  if (res.rowCount && res.rowCount > 0) {
    return { trackId: res.rows[0].track_id, isNew: true };
  }
  const existing = await client.query(
    `SELECT track_id FROM tracks WHERE tenant_id = $1 AND owner_id = $2 AND content_sha256 = $3`,
    [tenantId, ownerId, contentSha256]
  );
  return { trackId: existing.rows[0].track_id, isNew: false };
}