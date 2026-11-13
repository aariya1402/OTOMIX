import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { createRbacCache, publishInvalidation } from '../src/rbac/cache';
import { RBAC_CACHE_TTL_SECONDS } from '../src/constants';
const TIMEOUT = 180_000;
const A = { userId: 'user-a', tenantId: 'otomix' };
const B = { userId: 'user-a', tenantId: 'otodj' };
let ctr: StartedRedisContainer;
let r: Redis;
beforeAll(async () => {
  ctr = await new RedisContainer('redis:7-alpine').start();
  r = new Redis({ host: ctr.getHost(), port: ctr.getMappedPort(6379) });
}, TIMEOUT);
afterAll(async () => { await r?.quit(); await ctr?.stop(); }, TIMEOUT);
describe('rbac cache (RBAC-M06)', () => {
  it('(a) get on cold cache returns null', async () => {
    const c = createRbacCache({ redis: r });
    expect(await c.get(A)).toBeNull();
    await c.shutdown();
  });
  it('(b) set then get returns same set', async () => {
    const c = createRbacCache({ redis: r });
    const p = new Set(['dsp:*', 'local:process']);
    await c.set(A, p);
    const got = await c.get(A);
    expect(got).not.toBeNull();
    expect(Array.from(got!).sort()).toEqual(Array.from(p).sort());
    await c.shutdown();
  });
  it('(c) TTL ~ 60s', async () => {
    const c = createRbacCache({ redis: r });
    await c.set(A, new Set(['x']));
    const ttl = await r.ttl('otomix:rbac:eff:otomix:user-a');
    expect(ttl).toBeGreaterThan(RBAC_CACHE_TTL_SECONDS - 3);
    expect(ttl).toBeLessThanOrEqual(RBAC_CACHE_TTL_SECONDS);
    await c.shutdown();
  });
  it('(d) del removes cache', async () => {
    const c = createRbacCache({ redis: r });
    await c.set(A, new Set(['x']));
    await c.del(A);
    expect(await c.get(A)).toBeNull();
    await c.shutdown();
  });
  it('(e) getOrCompute on cold calls compute once', async () => {
    const c = createRbacCache({ redis: r });
    const spy = vi.fn(async () => new Set(['y']));
    const res = await c.getOrCompute(A, spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(Array.from(res)).toEqual(['y']);
    await c.shutdown();
  });
  it('(f) getOrCompute on warm does not call compute', async () => {
    const c = createRbacCache({ redis: r });
    await c.set(A, new Set(['z']));
    const spy = vi.fn(async () => new Set(['z']));
    const res = await c.getOrCompute(A, spy);
    expect(spy).not.toHaveBeenCalled();
    expect(Array.from(res)).toEqual(['z']);
    await c.shutdown();
  });
  it('(g) subscribeInvalidation + publishInvalidation deletes key', async () => {
    const c = createRbacCache({ redis: r });
    const got: { tenantId: string; userId: string }[] = [];
    await c.subscribeInvalidation((ctx) => got.push(ctx));
    await c.set(A, new Set(['q']));
    await publishInvalidation(r, A);
    await new Promise((res) => setTimeout(res, 100));
    expect(await c.get(A)).toBeNull();
    expect(got.length).toBe(1);
    expect(got[0]).toEqual({ tenantId: 'otomix', userId: 'user-a' });
    await c.shutdown();
  });
  it('(h) cross-tenant isolation', async () => {
    const c = createRbacCache({ redis: r });
    await c.set(A, new Set(['a-only']));
    expect(await c.get(B)).toBeNull();
    await c.set(B, new Set(['b-only']));
    const a = await c.get(A);
    const b = await c.get(B);
    expect(Array.from(a!)).toEqual(['a-only']);
    expect(Array.from(b!)).toEqual(['b-only']);
    await c.shutdown();
  });
});
