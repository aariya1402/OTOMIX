// OTOMIX 5.8; 2.5 - Mother 1; Add. 3 - GAP-017; GAP-022; GAP-025
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { retry } from '@otomix/core';
import { parkToDlq } from '../src/dlq/park';
import { DLQ_STREAM } from '../src/dlq/types';
import { createLogger } from '@otomix/core';

const TEST_TIMEOUT = 180_000;
const TRACE_ID = '0123456789abcdef0123456789abcdef';

describe('parkToDlq (P07-T04-S01-M01)', () => {
  let container: StartedRedisContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
    });
    await redis.ping();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (redis) await redis.quit();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  it('parks one DLQ message after 4 total attempts (1 try + 3 retries)', async () => {
    const logger = createLogger({ service: 'test' });
    const handler = vi.fn(async () => {
      throw new Error('simulated_failure');
    });

    let caught: unknown = null;
    try {
      await retry(handler, { idempotent: true });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(handler).toHaveBeenCalledTimes(4);

    await parkToDlq(
      redis,
      {
        job_id: 'job-001',
        reason: (caught as Error).message,
        trace_id: TRACE_ID,
        attempts: 4,
      },
      { logger },
    );

    const entries = await redis.xrange(DLQ_STREAM, '-', '+');
    expect(entries.length).toBe(1);

    const [, fields] = entries[0]!;
    const map: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      map[fields[i]!] = fields[i + 1]!;
    }
    expect(map['job_id']).toBe('job-001');
    expect(map['reason']).toBe('simulated_failure');
    expect(map['trace_id']).toBe(TRACE_ID);
    expect(map['attempts']).toBe('4');
  }, TEST_TIMEOUT);

  it('every DLQ entry has a trace_id that matches a 32-hex string', async () => {
    const entries = await redis.xrange(DLQ_STREAM, '-', '+');
    expect(entries.length).toBe(1);

    const [, fields] = entries[0]!;
    let traceId = '';
    for (let i = 0; i < fields.length; i += 2) {
      if (fields[i] === 'trace_id') traceId = fields[i + 1]!;
    }
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  }, TEST_TIMEOUT);

  it('successive parks append (not overwrite) the DLQ stream', async () => {
    const logger = createLogger({ service: 'test' });
    await parkToDlq(
      redis,
      {
        job_id: 'job-002',
        reason: 'second_failure',
        trace_id: 'ffeeddccbbaa99887766554433221100',
        attempts: 4,
      },
      { logger },
    );
    const len = await redis.xlen(DLQ_STREAM);
    expect(len).toBe(2);
  }, TEST_TIMEOUT);
});