// OTOMIX 5.8; 8.8; 9.3 - GAP-017; GAP-022; GAP-025; GAP-026
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { createLogger } from '@otomix/core';
import { createIdempotencyStore } from '../src/idempotency/store';
import { parkToDlq } from '../src/dlq/park';
import { replayDlq } from '../src/dlq/replay';
import { DLQ_STREAM } from '../src/dlq/types';

const TEST_TIMEOUT = 180_000;
const TRACE_ID = '0123456789abcdef0123456789abcdef';

describe('replayDlq (P07-T04-S01-M02)', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let idem: ReturnType<typeof createIdempotencyStore>;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
    });
    await redis.ping();
    idem = createIdempotencyStore(redis);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (redis) await redis.quit();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  it('first replay: handler runs once, entry removed, status fresh', async () => {
    const logger = createLogger({ service: 'test' });
    const jobId = 'replay-001';
    await parkToDlq(
      redis,
      {
        job_id: jobId,
        reason: 'simulated_failure',
        trace_id: TRACE_ID,
        attempts: 4,
        payload: JSON.stringify({ action: 'test', value: 42 }),
      },
      { logger },
    );

    let sideEffects = 0;
    const result = await replayDlq(
      redis,
      jobId,
      async () => {
        sideEffects += 1;
      },
      { logger, idempotencyStore: idem },
    );

    expect(result.status).toBe('fresh');
    expect(sideEffects).toBe(1);

    const lenAfter = await redis.xlen(DLQ_STREAM);
    expect(lenAfter).toBe(0);
  }, TEST_TIMEOUT);

  it('second replay: no-op, status replay, handler not invoked', async () => {
    const logger = createLogger({ service: 'test' });
    const jobId = 'replay-002';
    await parkToDlq(
      redis,
      {
        job_id: jobId,
        reason: 'simulated_failure',
        trace_id: TRACE_ID,
        attempts: 4,
        payload: JSON.stringify({ action: 'test', value: 7 }),
      },
      { logger },
    );

    let sideEffects = 0;
    const handler = async () => {
      sideEffects += 1;
    };

    const first = await replayDlq(redis, jobId, handler, { logger, idempotencyStore: idem });
    expect(first.status).toBe('fresh');
    expect(sideEffects).toBe(1);

    const second = await replayDlq(redis, jobId, handler, { logger, idempotencyStore: idem });
    expect(second.status).toBe('replay');
    expect(sideEffects).toBe(1);
  }, TEST_TIMEOUT);

  it('payload mismatch on same job_id: conflict is raised, no extra side effect', async () => {
    const logger = createLogger({ service: 'test' });
    const jobId = 'replay-003';

    await parkToDlq(
      redis,
      {
        job_id: jobId,
        reason: 'simulated_failure',
        trace_id: TRACE_ID,
        attempts: 4,
        payload: JSON.stringify({ action: 'A' }),
      },
      { logger },
    );

    let sideEffects = 0;
    await replayDlq(
      redis,
      jobId,
      async () => {
        sideEffects += 1;
      },
      { logger, idempotencyStore: idem },
    );
    expect(sideEffects).toBe(1);

    await parkToDlq(
      redis,
      {
        job_id: jobId,
        reason: 'second_failure',
        trace_id: TRACE_ID,
        attempts: 4,
        payload: JSON.stringify({ action: 'B' }),
      },
      { logger },
    );

    await expect(
      replayDlq(
        redis,
        jobId,
        async () => {
          sideEffects += 1;
        },
        { logger, idempotencyStore: idem },
      ),
    ).rejects.toThrow(/conflict/);

    expect(sideEffects).toBe(1);
  }, TEST_TIMEOUT);
});