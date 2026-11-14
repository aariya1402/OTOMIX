// OTOMIX 5.1; 9.5 - Mother 1; Add. 1-2 - GAP-014
// M03 stub. Commits the track row via upsertTrackDedup.
// M03 will add features + outbox to complete the single-transaction commit.

import type { PoolClient } from '@otomix/core';
import { upsertTrackDedup } from './dedup.js';

export interface CommitIngestData {
  tenantId: string;
  ownerId: string;
  contentSha256: Uint8Array;
  format: string;
  durationMs: number;
  storageKey: string;
}

export async function commitIngestTransaction(
  client: PoolClient,
  data: CommitIngestData,
): Promise<string> {
  const { trackId } = await upsertTrackDedup(
    client,
    data.tenantId,
    data.ownerId,
    data.contentSha256,
    data.format,
    data.durationMs,
    data.storageKey,
  );
  return trackId;
}