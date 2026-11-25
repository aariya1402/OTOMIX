// OTOMIX 5.8; 2.5; 8.8 - Mother 1; Add. 3 - GAP-017; GAP-025
import type Redis from 'ioredis';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';
import { DLQ_STREAM } from './types.js';
import type { DlqMessage } from './types.js';

export interface ParkDeps {
  logger?: Logger;
}
export interface ParkInput {
  job_id: string;
  reason: string;
  trace_id: string;
  attempts: number;
  payload?: string;
}

export async function parkToDlq(
  redis: Redis,
  input: ParkInput,
  deps: ParkDeps = {}
): Promise<string> {
  const logger = deps.logger ?? createLogger({ service: 'gateway-dlq' });
  const message: DlqMessage = {
    job_id: input.job_id,
    reason: input.reason,
    trace_id: input.trace_id,
    attempts: input.attempts,
    parked_at: new Date().toISOString(),
    payload: input.payload ?? '',
  };
  const entryId = await redis.xadd(
    DLQ_STREAM,
    '*',
    'job_id',
    message.job_id,
    'reason',
    message.reason,
    'trace_id',
    message.trace_id,
    'attempts',
    String(message.attempts),
    'parked_at',
    message.parked_at,
    'payload',
    message.payload
  );
  if (entryId === null) throw new Error('parkToDlq: xadd returned null');
  logger.log({
    level: 'error',
    trace_id: message.trace_id,
    span_id: 'dlq-park',
    event: 'ingest.dlq_parked',
    outcome: 'failure',
    durationMs: 0,
    job_id: message.job_id,
    reason: message.reason,
    attempts: message.attempts,
  });
  return entryId;
}
