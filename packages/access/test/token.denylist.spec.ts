import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import {
  denyJti,
  denyFamily,
  isDenied,
  isFamilyDenied,
  TokenRevokedError,
} from '../src/token/denylist';
import { mapStatus } from '../../gateway/src/status-map';

const TEST_TIMEOUT = 180_000;
const JTI = 'jti-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const FAMILY = 'family-11111111-2222-4333-8444-555555555555';

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

describe('deny-list (P06-T01-S02-M01)', () => {
  it('(a1) denyJti writes key with TTL = exp - now', async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    await denyJti(JTI, exp, redis);
    const ttl = await redis.ttl('otomix:deny:jti:' + JTI);
    expect(ttl).toBeGreaterThan(595);
    expect(ttl).toBeLessThanOrEqual(600);
  });

  it('(a2) denyFamily writes key with TTL = exp - now', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    await denyFamily(FAMILY, exp, redis);
    const ttl = await redis.ttl('otomix:deny:family:' + FAMILY);
    expect(ttl).toBeGreaterThan(3595);
    expect(ttl).toBeLessThanOrEqual(3600);
  });

  it('(a3) past exp clamps TTL to at least 1s', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 100;
    const pastJti = 'jti-past-exp';
    await denyJti(pastJti, pastExp, redis);
    const ttl = await redis.ttl('otomix:deny:jti:' + pastJti);
    expect(ttl).toBeGreaterThanOrEqual(1);
    expect(ttl).toBeLessThanOrEqual(2);
  });

  it('(b1) isDenied returns true for a denied jti', async () => {
    const jti = 'jti-b1';
    await denyJti(jti, Math.floor(Date.now() / 1000) + 60, redis);
    expect(await isDenied(jti, redis)).toBe(true);
  });

  it('(b2) isDenied returns false for an unknown jti', async () => {
    expect(await isDenied('jti-unknown-' + Date.now(), redis)).toBe(false);
  });

  it('(b3) isFamilyDenied true for denied family, false for unknown', async () => {
    const fam = 'fam-b3';
    await denyFamily(fam, Math.floor(Date.now() / 1000) + 60, redis);
    expect(await isFamilyDenied(fam, redis)).toBe(true);
    expect(await isFamilyDenied('fam-unknown-' + Date.now(), redis)).toBe(false);
  });

  it('(c1) simulated gateway check throws TokenRevokedError mapped to 401', async () => {
    const jti = 'jti-c1';
    await denyJti(jti, Math.floor(Date.now() / 1000) + 60, redis);

    let thrown: unknown = null;
    try {
      if (await isDenied(jti, redis)) {
        throw new TokenRevokedError('revoked');
      }
    } catch (e) { thrown = e; }

    expect(thrown).toBeInstanceOf(TokenRevokedError);
    expect((thrown as TokenRevokedError).code).toBe('UNAUTHENTICATED');
    expect(mapStatus((thrown as TokenRevokedError).code)).toBe(401);
  });

  it('(c2) when not denied, no error thrown and mapStatus not exercised', async () => {
    const jti = 'jti-c2-clean-' + Date.now();
    let thrown: unknown = null;
    try {
      if (await isDenied(jti, redis)) {
        throw new TokenRevokedError('revoked');
      }
    } catch (e) { thrown = e; }
    expect(thrown).toBeNull();
  });
});