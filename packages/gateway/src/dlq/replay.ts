// OTOMIX 5.8; 8.8; 9.3 - Mother 1; Add. 8 - GAP-017; GAP-025; GAP-026
// Replay one DLQ entry by job_id, idempotent via withIdempotency(job_id, sha256(payload), handler).
// XDEL only when the handler runs fresh; replay is a no-op; conflict is an error.

import { createHash } from 'node:crypto';
import type Redis from 'ioredis';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';
import { DLQ_STREAM } from './types.js';
import type { IdempotencyStore } from '../idempotency/store.js';

export interface ReplayDeps {
  logger?: Logger;
  idempotencyStore: IdempotencyStore;
}

export type ReplayResultStatus = 'fresh' | 'replay' | 'conflict' | 'not_found';

export interface ReplayResult {
  status: ReplayResultStatus;
  job_id: string;
}

export type ReplayHandler = (payload: string) => Promise<void>;

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function fieldsToMap(fields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    out[fields[i]!] = fields[i + 1]!;
  }
  return out;
}

export async function replayDlq(
  redis: Redis,
  jobId: string,
  handler: ReplayHandler,
  deps: ReplayDeps,
): Promise<ReplayResult> {
  const logger = deps.logger ?? createLogger({ service: 'gateway-dlq' });
  const idem = deps.idempotencyStore;

  const entries = await redis.xrange(DLQ_STREAM, '-', '+');
  const match = entries.find(([, fields]) => {
    const map = fieldsToMap(fields);
    return map['job_id'] === jobId;
  });

  if (!match) {
    const prior = await idem.getResponse(jobId);
    if (prior && prior.status === 'completed') {
      logger.log({
        level: 'info',
        trace_id: 'dlq-replay',
        span_id: 'replay',
        event: 'dlq.replayed',
        outcome: 'success',
        durationMs: 0,
        job_id: jobId,
        status: 'replay',
      });
      return { status: 'replay', job_id: jobId };
    }
    logger.log({
      level: 'warn',
      trace_id: 'dlq-replay',
      span_id: 'replay',
      event: 'dlq.replay_not_found',
      outcome: 'failure',
      durationMs: 0,
      job_id: jobId,
    });
    return { status: 'not_found', job_id: jobId };
  }

  const [entryId, fields] = match;
  const map = fieldsToMap(fields);
  const payload = map['payload'] ?? '';
  const fingerprint = sha256Hex(payload);
  const start = Date.now();

  const idemResult = await idem.withIdempotency(jobId, fingerprint, async () => {
    await handler(payload);
  });

  if (idemResult.status === 'conflict') {
    logger.log({
      level: 'error',
      trace_id: 'dlq-replay',
      span_id: 'replay',
      event: 'dlq.replay_conflict',
      outcome: 'failure',
      durationMs: Date.now() - start,
      job_id: jobId,
    });
    throw new Error('dlq replay conflict: fingerprint mismatch for job_id ' + jobId);
  }

  if (idemResult.status === 'fresh') {
    await redis.xdel(DLQ_STREAM, entryId);
  }

  logger.log({
    level: 'info',
    trace_id: 'dlq-replay',
    span_id: 'replay',
    event: 'dlq.replayed',
    outcome: 'success',
    durationMs: Date.now() - start,
    job_id: jobId,
    status: idemResult.status,
  });

  return { status: idemResult.status, job_id: jobId };
}