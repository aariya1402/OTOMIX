// OTOMIX 5.1; 9.10; 9.11 - Mother 1; Add. 1-2 - GAP-023; GAP-030
// Enrichment queue consumer: processes 'otomix.enrichment.request' outbox messages.
// Runs runEnrichment() and updates feature row to 'complete' on success.

import type { Pool, PoolClient } from 'pg';
import { runEnrichment, EngineRunner } from '@otomix/core/pipeline/enrichment';
import { FeaturesExtractionRepository, GlobalFeaturesRepository } from '@otomix/db';
import { createLogger, Logger, LogRecord } from '@otomix/core';

export interface EnrichmentRequest {
  readonly track_id: string;
  readonly tenant_id: string;
  readonly content_sha256: string;
  readonly format: string;
  readonly pcm_buffer_base64: string;
  readonly sample_rate: number;
  readonly channels: number;
  readonly length: number;
  readonly worker_id: string;
  readonly analysis_version: string;
}

export interface EnrichmentDeps {
  pool: Pool;
  workerRegistry: { get(id: string): { path?: string } | undefined };
  engine: EngineRunner;
  logger?: Logger;
}

interface OutboxMessage {
  message_id: string;
  topic: string;
  payload: unknown;
}

export async function processEnrichmentQueue(
  deps: EnrichmentDeps,
  batchSize: number = 10,
): Promise<{ processed: number; failed: number }> {
  const logger = deps.logger ?? createLocalLogger({ service: 'gateway-enrichment-consumer' });
  const repo = new FeaturesExtractionRepository(deps.pool);
  const globalRepo = new GlobalFeaturesRepository(deps.pool);
  let processed = 0;
  let failed = 0;

  const client = await deps.pool.connect();
  try {
    // Fetch pending enrichment messages
    const res = await client.query<OutboxMessage>(
      `SELECT message_id, topic, payload
       FROM outbox
       WHERE topic = 'otomix.enrichment.request'
         AND delivered_at IS NULL
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize],
    );

    for (const msg of res.rows) {
      let request: EnrichmentRequest;
      try {
        request = typeof msg.payload === 'string'
          ? JSON.parse(msg.payload)
          : (msg.payload as unknown as EnrichmentRequest);
      } catch (e) {
        logger.log({
          level: 'error',
          event: 'enrichment.parse_failed',
          outcome: 'failure',
          message_id: msg.message_id,
          error: (e as Error).message,
          trace_id: 'enrichment-consumer',
          span_id: 'parse',
          durationMs: 0,
        } satisfies LogRecord);
        await markDelivered(client, msg.message_id, 'PARSE_ERROR');
        failed++;
        continue;
      }

      try {
        const result = await runEnrichment({
          contentSha256: request.content_sha256,
          trackId: request.track_id,
          analysisVersion: request.analysis_version,
          workerId: request.worker_id,
          tenantId: request.tenant_id,
          pcmBufferBase64: request.pcm_buffer_base64,
          sampleRate: request.sample_rate,
          channels: request.channels,
          length: request.length,
        }, {
          cache: {
            get: async (sha256) => {
              return globalRepo.getFeature(sha256);
            },
            upsert: async (sha256, data, version) => {
              await globalRepo.upsertFeature(sha256, data, version);
            },
          },
          tenantStore: {
            write: async (_tenantId: string, trackId: string, rawFeatures: Record<string, unknown>, schemaVersion: string) => {
              const bpm = typeof rawFeatures.bpm === 'number' ? rawFeatures.bpm : 120;
              const camelotKey = typeof rawFeatures.camelot_key === 'string' ? rawFeatures.camelot_key : '1A';
              const energyScalar = typeof rawFeatures.energy === 'number'
                ? rawFeatures.energy
                : typeof rawFeatures.energy_scalar === 'number'
                  ? rawFeatures.energy_scalar
                  : 0;
              const mixability = typeof rawFeatures.mixability === 'number' ? rawFeatures.mixability : 0;
              const grooveMode = rawFeatures.groove_mode === 'triplet' || rawFeatures.groove_mode === 'swing'
                ? rawFeatures.groove_mode
                : 'straight';
              await repo.persist({
                tenantId: _tenantId as import('@otomix/db').TenantId,
                trackId,
                contentSha256: '', // Not used in persist
                schemaVersion,
                features: {
                  bpm,
                  camelotKey,
                  energyScalar,
                  energyStars: typeof rawFeatures.energy_stars === 'number' ? rawFeatures.energy_stars : 0,
                  mixability,
                  grooveMode,
                  registryJson: rawFeatures,
                },
              });
            },
          },
          engine: deps.engine,
          workerRegistry: {
            get: (id) => deps.workerRegistry.get(id),
          },
        } as import('@otomix/core/pipeline/enrichment').PipelineDeps);

        if (!result.ok) {
          logger.log({
            level: 'warn',
            event: 'enrichment.worker_error',
            outcome: 'failure',
            track_id: request.track_id,
            error: result.error,
            trace_id: request.track_id,
            span_id: 'enrichment',
            durationMs: 0,
          } satisfies LogRecord);
          await markDelivered(client, msg.message_id, 'WORKER_ERROR');
          failed++;
          continue;
        }

        // Update global cache
        await globalRepo.upsertFeature(
          request.content_sha256,
          result.result.features,
          request.analysis_version,
        );

        // Update feature row to 'complete'
        await markComplete(client, request.track_id, request.tenant_id);
        await markDelivered(client, msg.message_id, 'DELIVERED');
        processed++;

        logger.log({
          level: 'info',
          event: 'enrichment.completed',
          outcome: 'success',
          track_id: request.track_id,
          trace_id: request.track_id,
          span_id: 'enrichment',
          durationMs: 0,
        } satisfies LogRecord);
      } catch (e) {
        logger.log({
          level: 'error',
          event: 'enrichment.failed',
          outcome: 'failure',
          track_id: request.track_id,
          error: (e as Error).message,
          trace_id: request.track_id,
          span_id: 'enrichment',
          durationMs: 0,
        } satisfies LogRecord);
        await markDelivered(client, msg.message_id, 'CONSUMER_ERROR');
        failed++;
      }
    }
  } finally {
    client.release();
  }

  return { processed, failed };
}

async function markComplete(
  client: PoolClient,
  trackId: string,
  tenantId: string,
): Promise<void> {
  await client.query(
    `UPDATE features
     SET analysis_status = 'complete'
     WHERE track_id = $1 AND tenant_id = $2`,
    [trackId, tenantId],
  );
}

async function markDelivered(
  client: PoolClient,
  messageId: string,
  status: string,
): Promise<void> {
  await client.query(
    `UPDATE outbox
     SET delivered_at = now(), delivery_status = $2
     WHERE message_id = $1`,
    [messageId, status],
  );
}

function createLocalLogger(options: { service: string }): Logger {
  return createLogger(options);
}