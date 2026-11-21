// OTOMIX 5.1; 9.10 - Mother 1; Add. 1-2 - GAP-014; GAP-017
// POST /api/v1/ingest/local. Assumes interceptor ran (claims present)
// and validateIdempotencyKey passed. Delegates commit to M03 stub.
//
// PIPELINE ORDER (GATE0-VER-M02):
// rate-limit → auth/permission → sniff → limits → confine → decode (sandboxed) → tags → dedup → commit

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRateLimitMiddleware } from '../ingest/ratelimit.js';
import { sniffForGateway } from '../ingest/sniff.js';
import { runDecodeWorker } from '../ingest/decode-worker.js';
import { extractTagsForGateway } from '../ingest/tags.js';
import { checkDedup } from '../ingest/dedup.js';
import { createLogger, DEFAULT_LIMITS } from '@otomix/core';
import type { Logger } from '@otomix/core';
import type { PoolClient } from 'pg';
import { setTenantId } from '../db/tenant';
import type { IdempotencyStore } from '../idempotency/store';
import { recordDeclaration } from '../declarations/record.js';
import type { TokenClaims } from '../interceptor';

export interface IngestLocalDeps {
  logger?: Logger;
  maxBodyBytes?: number;
  rateLimitCapacity?: number;
  pool: { connect: () => Promise<PoolClient> };
  idempotencyStore: IdempotencyStore;
  ingestRoot?: string;
  limitsConfig?: {
    maxBytes?: number;
    maxDurationSec?: number;
  };
}

interface IngestResponseBody {
  track_id: string;
  format: string;
  sha256: string;
  display_metadata: object;
  enrichment_status?: 'pending' | 'complete';
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

type LimitedBodyResult = { ok: true; body: Buffer } | { ok: false };

function readLimitedBody(req: IncomingMessage, maxBytes: number): Promise<LimitedBodyResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;
    let overLimit = false;

    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    };
    const onData = (chunk: Buffer) => {
      if (overLimit) return;
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        overLimit = true;
        chunks.length = 0;
        resolve({ ok: false });
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      if (!overLimit) resolve({ ok: true, body: Buffer.concat(chunks, bytesRead) });
    };
    const onError = (error: Error) => {
      cleanup();
      if (!overLimit) reject(error);
    };

    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
  });
}

export function createIngestLocalRoute(deps: IngestLocalDeps) {
  const logger = deps.logger ?? buildDefaultLogger();
  const pool = deps.pool;
  const maxBodyBytes = deps.maxBodyBytes ?? DEFAULT_LIMITS.maxBytes;

  const rateLimit = createRateLimitMiddleware({
    ...(deps.rateLimitCapacity !== undefined ? { capacity: deps.rateLimitCapacity } : {}),
    keyOf: (req) => (req as IncomingMessage & { claims?: TokenClaims }).claims?.sub ?? null,
  });

  // fingerprintOf removed - not used in current pipeline

  return async function ingestLocalRoute(
    req: IncomingMessage,
    res: ServerResponse,
    claims: TokenClaims,
  ): Promise<void> {
    const startTime = Date.now();
    const traceId = randomUUID();
    const spanId = randomUUID();

    (req as IncomingMessage & { claims?: TokenClaims }).claims = claims;

    // Step 1: Rate limit (already attached via interceptor, but enforce here too)
    let rateLimitPassed = false;
    rateLimit(req, res, () => { rateLimitPassed = true; });
    if (!rateLimitPassed) return;

    const idempotencyKey = req.headers['idempotency-key'];
    if (typeof idempotencyKey === 'string' && idempotencyKey.length > 0) {
      const replay = await deps.idempotencyStore.getResponse(idempotencyKey);
      if (replay?.status === 'completed' && replay.response !== undefined) {
        sendJson(res, 200, replay.response);
        return;
      }
    }

    // Step 2: Reject oversized declared or streamed bodies before decoding.
    const contentLength = req.headers['content-length'];
    if (typeof contentLength === 'string') {
      const declaredBytes = Number(contentLength);
      if (Number.isFinite(declaredBytes) && declaredBytes > maxBodyBytes) {
        sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: `File size exceeds ${DEFAULT_LIMITS.maxBytes / (1024 * 1024)} MB limit` });
        return;
      }
    }

    // Step 3: Read body once with a hard byte cap.
    const bodyResult = await readLimitedBody(req, maxBodyBytes);
    if (!bodyResult.ok) {
      sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: `File size exceeds ${DEFAULT_LIMITS.maxBytes / (1024 * 1024)} MB limit` });
      logger.log({
        level: 'warn',
        trace_id: traceId,
        span_id: spanId,
        event: 'ingest.size_exceeded',
        outcome: 'failure',
        durationMs: Date.now() - startTime,
      });
      return;
    }
    const fileBytes = bodyResult.body;

    // Step 4: Sniff (detect format from magic bytes)
    const filename = (req.headers['x-filename'] as string | undefined) ?? 'unknown';
    const sniffed = sniffForGateway(new Uint8Array(fileBytes), filename, {
      logger,
      trace_id: traceId,
      span_id: spanId,
    });
    if (sniffed.format === 'unknown') {
      sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: 'Unsupported audio format' });
      return;
    }

    // Step 5: Confine (path traversal protection - for local files if applicable)
    // For upload ingestion, confine is not directly applicable, but we keep the step
    // for consistency with the pipeline interface. Cloud path uses it for file paths.
    // Here we skip but log for audit trail.
    logger.log({
      level: 'debug',
      trace_id: traceId,
      span_id: spanId,
      event: 'ingest.confine_skipped',
      outcome: 'success',
      durationMs: 0,
      reason: 'upload_ingestion',
    });

    // Step 6: Decode (sandboxed worker)
    const decoded = await runDecodeWorker(new Uint8Array(fileBytes), sniffed.format);
    if (!decoded.ok) {
      sendJson(res, 400, { error: 'INVALID_ARGUMENT', message: decoded.message });
      logger.log({
        level: 'warn',
        trace_id: traceId,
        span_id: spanId,
        event: 'ingest.decode_failed',
        outcome: 'failure',
        durationMs: Date.now() - startTime,
        error: decoded.message,
      });
      return;
    }

    // Step 7: Tags (metadata extraction) - uses original bytes, not decoded PCM
    const tags = extractTagsForGateway(new Uint8Array(fileBytes), sniffed.format, {
      logger,
      trace_id: traceId,
      span_id: spanId,
    });

    // Step 8: Deduplication (content-hash based)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setTenantId(client, claims.tenant_id);

      const dedupResult = await checkDedup(
        client,
        claims.tenant_id,
        claims.sub,
        hexToBytes(decoded.value.sha256),
        { logger, trace_id: traceId, span_id: spanId },
      );

      let trackId: string;
      let isNew = true;

      if (dedupResult.exists) {
        // Track already exists for this user
        trackId = dedupResult.trackId!;
        const featureStatus = await client.query<{ analysis_status: string }>(
          `SELECT analysis_status FROM features
           WHERE tenant_id = $1 AND track_id = $2
           LIMIT 1`,
          [claims.tenant_id, trackId],
        );
        isNew = featureStatus.rows[0]?.analysis_status !== 'complete';
      } else {
        // Insert new track
        const durationMs = Math.round((decoded.value.pcm.length / decoded.value.sampleRate) * 1000);
        const storageKey = 's3://bucket/' + decoded.value.sha256 + '.' + sniffed.format;
        const insertResult = await client.query(
          `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           RETURNING track_id`,
          [claims.tenant_id, claims.sub, hexToBytes(decoded.value.sha256), sniffed.format, durationMs, storageKey],
        );
        trackId = insertResult.rows[0].track_id;

        await client.query(
          `INSERT INTO features (
             feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
             energy_scalar, energy_stars, mixability, groove_mode, registry_json,
             analysis_status
           ) VALUES (
             gen_random_uuid(), $1, $2, '1.2.0', 120, '1A',
             0, 0, 0, 'straight', '{}'::jsonb, 'placeholder'
           )`,
          [claims.tenant_id, trackId],
        );
      }

      await recordDeclaration(client, {
        tenantId: claims.tenant_id,
        userId: claims.sub,
        scope: 'ingest',
        termsVersion: 'v1.0',
        declaredAt: new Date(),
      });

      // Emit outbox event for async enrichment (GATE0-P05-M07 / GAP-023 / GAP-030)
      const enrichmentMessageId = randomUUID();
      const enrichmentPayload = JSON.stringify({
        track_id: trackId,
        tenant_id: claims.tenant_id,
        content_sha256: decoded.value.sha256,
        format: sniffed.format,
        pcm_buffer_base64: Buffer.from(decoded.value.pcm).toString('base64'),
        sample_rate: decoded.value.sampleRate,
        channels: decoded.value.pcm.length > 0 ? 1 : 1, // mono for analysis
        length: decoded.value.pcm.length,
        worker_id: 'default', // TODO: resolve from worker registry
        analysis_version: '1.2.0',
      });
      if (isNew) {
        await client.query(
          `INSERT INTO outbox (message_id, tenant_id, topic, payload)
           VALUES ($1, $2, $3, $4)`,
          [enrichmentMessageId, claims.tenant_id, 'otomix.enrichment.request', enrichmentPayload],
        );
      }

      await client.query('COMMIT');

      // Return 202 for new tracks (enrichment pending), 200 for replayed
      const responseBody: IngestResponseBody = {
        track_id: trackId,
        format: sniffed.format,
        sha256: decoded.value.sha256,
        display_metadata: tags.displayMetadata,
        enrichment_status: isNew ? 'pending' : 'complete',
      };

      if (typeof idempotencyKey === 'string' && idempotencyKey.length > 0) {
        await deps.idempotencyStore.withIdempotency(
          idempotencyKey,
          `${claims.tenant_id}:${decoded.value.sha256}`,
          async () => responseBody,
        );
      }

      if (isNew) {
        sendJson(res, 202, responseBody);
        logger.log({
          level: 'info',
          trace_id: traceId,
          span_id: spanId,
          event: 'ingest.local_created',
          outcome: 'success',
          durationMs: Date.now() - startTime,
        });
      } else {
        sendJson(res, 200, responseBody);
        logger.log({
          level: 'info',
          trace_id: traceId,
          span_id: spanId,
          event: 'ingest.local_replayed',
          outcome: 'success',
          durationMs: Date.now() - startTime,
        });
      }
    } catch (err) {
      await client.query('ROLLBACK');
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
    } finally {
      client.release();
    }
  };
}