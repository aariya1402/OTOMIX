// OTOMIX 5.1; 9.10 - Mother 1; Add. 1-2 - GAP-014; GAP-017
// POST /api/v1/ingest/local. Assumes interceptor ran (claims present)
// and validateIdempotencyKey passed. Delegates commit to M03 stub.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  sniffForGateway,
  rejectForGateway,
  extractTagsForGateway,
} from '../ingest';
import { runDecodeWorker } from '../ingest/decode-worker';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';
import type { PoolClient } from 'pg';
import { setTenantId } from '../db/tenant';
import type { IdempotencyStore } from '../idempotency/store';
import { commitIngestTransaction } from '../ingest/commit';
import { recordDeclaration } from '../declarations/record.js';
import type { TokenClaims } from '../interceptor';

export interface IngestLocalDeps {
  logger?: Logger;
  pool: { connect: () => Promise<PoolClient> };
  idempotencyStore: IdempotencyStore;
}

interface IngestResponseBody {
  track_id: string;
  format: string;
  sha256: string;
  display_metadata: Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function fingerprintOf(method: string, path: string, bodyHash: string): string {
  return method + '|' + path + '|' + bodyHash;
}

export function createIngestLocalRoute(deps: IngestLocalDeps) {
  const logger = deps.logger ?? buildDefaultLogger();
  const pool = deps.pool;
  const idemStore = deps.idempotencyStore;

  return async function ingestLocalRoute(
    req: IncomingMessage,
    res: ServerResponse,
    claims: TokenClaims,
  ): Promise<void> {
    const traceId = randomUUID();
    const spanId = randomUUID();
    const startTime = Date.now();

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const fileBytes = Buffer.concat(chunks);
    const filename = (req.headers['x-filename'] as string | undefined) ?? 'unknown';

    const sniffed = sniffForGateway(fileBytes, filename, {
      logger,
      trace_id: traceId,
      span_id: spanId,
    });
    if (sniffed.format === 'unknown') {
      sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'Unsupported audio format' });
      return;
    }

    const decoded = await runDecodeWorker(new Uint8Array(fileBytes), sniffed.format);
    if (!decoded.ok) {
      rejectForGateway(sniffed.format, new Uint8Array(fileBytes), decoded.message, {
        logger,
        trace_id: traceId,
        span_id: spanId,
      });
      sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: decoded.message });
      return;
    }

    const tags = extractTagsForGateway(new Uint8Array(fileBytes), sniffed.format, {
      logger,
      trace_id: traceId,
      span_id: spanId,
    });

    const idemKey = (req.headers['idempotency-key'] as string | undefined) ?? '';
    const fp = fingerprintOf('POST', '/api/v1/ingest/local', decoded.value.sha256);

    try {
      const result = await idemStore.withIdempotency<IngestResponseBody>(idemKey, fp, async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await setTenantId(client, claims.tenant_id);
          const durationMs = Math.round((decoded.value.pcm.length / decoded.value.sampleRate) * 1000);
          const storageKey = 's3://bucket/' + decoded.value.sha256 + '.' + sniffed.format;
          const trackId = await commitIngestTransaction(client, {
            tenantId: claims.tenant_id,
            ownerId: claims.sub,
            contentSha256: hexToBytes(decoded.value.sha256),
            format: sniffed.format,
            durationMs,
            storageKey,
          });
          await recordDeclaration(client, {
            tenantId: claims.tenant_id,
            userId: claims.sub,
            scope: 'ingest',
            termsVersion: 'v1.0',
            declaredAt: new Date(),
          });
          await client.query('COMMIT');
          return {
            track_id: trackId,
            format: sniffed.format,
            sha256: decoded.value.sha256,
            display_metadata: tags.displayMetadata,
          };
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      });

      if (result.status === 'fresh' && result.response !== undefined) {
        sendJson(res, 201, result.response);
        logger.log({
          level: 'info',
          trace_id: traceId,
          span_id: spanId,
          event: 'ingest.local_created',
          outcome: 'success',
          durationMs: Date.now() - startTime,
        });
        return;
      }
      if (result.status === 'replay' && result.response !== undefined) {
        sendJson(res, 200, result.response);
        logger.log({
          level: 'info',
          trace_id: traceId,
          span_id: spanId,
          event: 'ingest.local_replayed',
          outcome: 'success',
          durationMs: Date.now() - startTime,
        });
        return;
      }
      sendJson(res, 409, { error: 'ABORTED', message: 'Idempotency conflict' });
      logger.log({
        level: 'warn',
        trace_id: traceId,
        span_id: spanId,
        event: 'ingest.local_conflict',
        outcome: 'failure',
        durationMs: Date.now() - startTime,
      });
    } catch (err) {
      logger.log({
        level: 'error',
        trace_id: traceId,
        span_id: spanId,
        event: 'ingest.local_failed',
        outcome: 'failure',
        durationMs: Date.now() - startTime,
        error: (err as Error).message,
      });
      sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Ingest failed' });
    }
  };
}