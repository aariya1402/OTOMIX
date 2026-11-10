// OTOMIX §9.3 · Mother Add. §1–§2
// Integration tests for the Redis idempotency store.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import {
  createIdempotencyStore,
  IdempotencyStore,
} from '../src/idempotency/store';

const TEST_TIMEOUT = 180_000;

describe('Idempotency Redis Store', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let store: IdempotencyStore;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
    });
    store = createIdempotencyStore(redis);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await store?.close();
    await container?.stop();
  }, TEST_TIMEOUT);

  it('fresh request executes handler, stores response, TTL ≈ 86400', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174000';
    const fp = 'fp-a';
    let handlerCalls = 0;

    const result = await store.withIdempotency(key, fp, async () => {
      handlerCalls++;
      return { data: 'hello' };
    });

    expect(result.status).toBe('fresh');
    expect(result.response).toEqual({ data: 'hello' });
    expect(handlerCalls).toBe(1);

    const ttl = await store.getTTL(key);
    expect(ttl).toBeGreaterThanOrEqual(86395);
    expect(ttl).toBeLessThanOrEqual(86405);

    const stored = await store.getResponse(key);
    expect(stored?.fingerprint).toBe(fp);
    expect(stored?.status).toBe('completed');
  }, TEST_TIMEOUT);

  it('same key + same fingerprint replays response, handler NOT called', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174001';
    const fp = 'fp-a';
    let handlerCalls = 0;

    const r1 = await store.withIdempotency(key, fp, async () => {
      handlerCalls++;
      return { data: 'first' };
    });
    expect(r1.status).toBe('fresh');

    const r2 = await store.withIdempotency(key, fp, async () => {
      handlerCalls++;
      return { data: 'second' };
    });
    expect(r2.status).toBe('replay');
    expect(r2.response).toEqual({ data: 'first' });
    expect(handlerCalls).toBe(1);
  }, TEST_TIMEOUT);

  it('same key + different fingerprint returns conflict, handler NOT called', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174002';
    let handlerCalls = 0;

    const r1 = await store.withIdempotency(key, 'fp-a', async () => {
      handlerCalls++;
      return { data: 'first' };
    });
    expect(r1.status).toBe('fresh');

    const r2 = await store.withIdempotency(key, 'fp-b', async () => {
      handlerCalls++;
      return { data: 'second' };
    });
    expect(r2.status).toBe('conflict');
    expect(handlerCalls).toBe(1);
  }, TEST_TIMEOUT);

  it('concurrent same key + same fingerprint: handler runs exactly once', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174003';
    const fp = 'fp-concurrent';
    let handlerCalls = 0;

    const promises = Array.from({ length: 5 }, () =>
      store.withIdempotency(key, fp, async () => {
        handlerCalls++;
        await new Promise((r) => setTimeout(r, 20));
        return { data: 'concurrent' };
      }),
    );

    const results = await Promise.all(promises);

    expect(handlerCalls).toBe(1);
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 'fresh').length).toBe(1);
    expect(statuses.filter((s) => s === 'replay').length).toBe(4);
    for (const r of results) {
      expect(r.response).toEqual({ data: 'concurrent' });
    }
  }, TEST_TIMEOUT);
});