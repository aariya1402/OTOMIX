import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { issueRefreshToken } from '../src/token/refresh';
import { revokeUser } from '../src/token/revoke-user';
import { isFamilyDenied } from '../src/token/denylist';

const TEST_TIMEOUT = 180_000;

let container: StartedRedisContainer;
let redis: Redis;

beforeAll(async () => {
  container = await new RedisContainer('redis:7-alpine').start();
  redis = new Redis({ host: container.getHost(), port: container.getMappedPort(6379) });
}, TEST_TIMEOUT);

afterAll(async () => {
  await redis?.quit();
  await container?.stop();
}, TEST_TIMEOUT);

describe('revokeUser (P06-T01-S02-M02)', () => {
  it('(a) issueRefreshToken indexes each family under user', async () => {
    const subA = 'user-a-' + Date.now();
    await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    const members = await redis.smembers('otomix:user:families:' + subA);
    expect(members.length).toBe(3);
    const ttl = await redis.ttl('otomix:user:families:' + subA);
    expect(ttl).toBeGreaterThan(0);
  });

  it('(b) revokeUser denies all 3 families of the user', async () => {
    const subA = 'user-b-' + Date.now();
    const t1 = await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    const t2 = await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    const t3 = await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    await revokeUser(subA, redis);
    expect(await isFamilyDenied(t1.claims.familyId, redis)).toBe(true);
    expect(await isFamilyDenied(t2.claims.familyId, redis)).toBe(true);
    expect(await isFamilyDenied(t3.claims.familyId, redis)).toBe(true);
  });

  it('(c) revokeUser does not affect unrelated users', async () => {
    const subA = 'user-c-a-' + Date.now();
    const subB = 'user-c-b-' + Date.now();
    await issueRefreshToken({ sub: subA, tenantId: 'otomix', tier: 1 }, redis);
    const tb = await issueRefreshToken({ sub: subB, tenantId: 'otomix', tier: 1 }, redis);
    await revokeUser(subA, redis);
    expect(await isFamilyDenied(tb.claims.familyId, redis)).toBe(false);
  });

  it('(d) revokeUser on a user with no families does not throw', async () => {
    const ghost = 'user-d-ghost-' + Date.now();
    await expect(revokeUser(ghost, redis)).resolves.toBeUndefined();
  });
});