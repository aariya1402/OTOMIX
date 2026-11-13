import type Redis from 'ioredis';
import { RBAC_CACHE_TTL_SECONDS } from '../constants';

export interface CacheCtx { userId: string; tenantId: string; }
export interface RbacCacheDeps { redis: Redis; ttlSeconds?: number; channel?: string; }
export interface RbacCache {
  get(ctx: CacheCtx): Promise<Set<string> | null>;
  set(ctx: CacheCtx, perms: Set<string>): Promise<void>;
  del(ctx: CacheCtx): Promise<void>;
  getOrCompute(ctx: CacheCtx, computeFn: () => Promise<Set<string>>): Promise<Set<string>>;
  subscribeInvalidation(onInvalidated: (ctx: CacheCtx) => void): Promise<void>;
  shutdown(): Promise<void>;
}

const PREFIX = 'otomix:rbac:eff:';
const DEFAULT_CHANNEL = 'otomix:rbac:invalidate';

function cacheKey(ctx: CacheCtx): string {
  return PREFIX + ctx.tenantId + ':' + ctx.userId;
}

export async function publishInvalidation(redis: Redis, ctx: CacheCtx, channel?: string): Promise<void> {
  const ch = channel ?? DEFAULT_CHANNEL;
  await redis.publish(ch, JSON.stringify({ tenantId: ctx.tenantId, userId: ctx.userId }));
}

export function createRbacCache(deps: RbacCacheDeps): RbacCache {
  const redis = deps.redis;
  const ttlSeconds = deps.ttlSeconds ?? RBAC_CACHE_TTL_SECONDS;
  const channel = deps.channel ?? DEFAULT_CHANNEL;
  let sub: Redis | null = null;
  async function get(ctx: CacheCtx): Promise<Set<string> | null> {
    const raw = await redis.get(cacheKey(ctx));
    if (raw === null) return null;
    return new Set<string>(JSON.parse(raw) as string[]);
  }
  async function set(ctx: CacheCtx, perms: Set<string>): Promise<void> {
    await redis.set(cacheKey(ctx), JSON.stringify(Array.from(perms)), 'EX', ttlSeconds);
  }
  async function del(ctx: CacheCtx): Promise<void> {
    await redis.del(cacheKey(ctx));
  }
  async function getOrCompute(ctx: CacheCtx, computeFn: () => Promise<Set<string>>): Promise<Set<string>> {
    const cached = await get(ctx);
    if (cached !== null) return cached;
    const fresh = await computeFn();
    await set(ctx, fresh);
    return fresh;
  }
  async function subscribeInvalidation(onInvalidated: (ctx: CacheCtx) => void): Promise<void> {
    if (sub === null) { sub = redis.duplicate(); }
    sub.on('message', async (ch: string, msg: string) => {
      if (ch !== channel) return;
      try {
        const p = JSON.parse(msg) as { tenantId: string; userId: string };
        if (typeof p.tenantId === 'string' && typeof p.userId === 'string') {
          await del({ userId: p.userId, tenantId: p.tenantId });
          onInvalidated({ userId: p.userId, tenantId: p.tenantId });
        }
      } catch { /* ignore malformed */ }
    });
    await sub.subscribe(channel);
  }
  async function shutdown(): Promise<void> {
    if (sub !== null) { const s = sub; sub = null; try { await s.quit(); } catch { } }
  }
  return { get, set, del, getOrCompute, subscribeInvalidation, shutdown };
}
