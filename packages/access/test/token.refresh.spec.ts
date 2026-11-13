import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { issueRefreshToken, rotateRefreshToken } from '../src/token/refresh';
import {
  RefreshTokenReuseError,
  RefreshTokenRevokedError,
} from '../src/token/types';
import { REFRESH_TTL_DAYS } from '../src/constants';

const TEST_TIMEOUT = 180_000;
const SUB = '11111111-1111-4111-8111-111111111111';

let container: StartedRedisContainer;
let redis: Redis;

beforeAll(async () => {
  container = await new RedisContainer('redis:7-alpine').start();
  redis = new Redis({
    host: container.getHost(),
    port: container.getMappedPort(6379),
  });
}, TEST_TIMEOUT);

afterAll(async () => {
  await redis?.quit();
  await container?.stop();
}, TEST_TIMEOUT);

describe('refresh token rotation (P06-T01-S01-M02)', () => {
  it('(a) lifetime equals REFRESH_TTL_DAYS*86400 and Redis TTL matches', async () => {
    const issued = await issueRefreshToken(
      { sub: SUB, tenantId: 'otomix', tier: 1 },
      redis,
    );
    expect(issued.claims.exp - issued.claims.iat).toBe(REFRESH_TTL_DAYS * 86400);
    expect(issued.claims.exp - issued.claims.iat).toBe(604800);
    const ttl = await redis.ttl('otomix:refresh:jti:' + issued.claims.jti);
    expect(ttl).toBeGreaterThan(604790);
    expect(ttl).toBeLessThanOrEqual(604800);
  });

  it('(b) second rotation succeeds and issues a new jti', async () => {
    const t1 = await issueRefreshToken({ sub: SUB, tenantId: 'otomix', tier: 1 }, redis);
    const t2 = await rotateRefreshToken(t1.token, redis);
    expect(t2.claims.jti).not.toBe(t1.claims.jti);
    const t3 = await rotateRefreshToken(t2.token, redis);
    expect(t3.claims.jti).not.toBe(t2.claims.jti);
    expect(t3.claims.familyId).toBe(t1.claims.familyId);
  });

  it('(c) reuse of a consumed token rejects with RefreshTokenReuseError', async () => {
    const t1 = await issueRefreshToken({ sub: SUB, tenantId: 'otomix', tier: 1 }, redis);
    await rotateRefreshToken(t1.token, redis);
    await expect(rotateRefreshToken(t1.token, redis)).rejects.toBeInstanceOf(
      RefreshTokenReuseError,
    );
  });

  it('(d) after reuse detection, the whole family is revoked (third token denied)', async () => {
    const t1 = await issueRefreshToken({ sub: SUB, tenantId: 'otomix', tier: 1 }, redis);
    const t2 = await rotateRefreshToken(t1.token, redis);
    const t3 = await rotateRefreshToken(t2.token, redis);
    await expect(rotateRefreshToken(t1.token, redis)).rejects.toBeInstanceOf(
      RefreshTokenReuseError,
    );
    await expect(rotateRefreshToken(t3.token, redis)).rejects.toBeInstanceOf(
      RefreshTokenRevokedError,
    );
  });
});