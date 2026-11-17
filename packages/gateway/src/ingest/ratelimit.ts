// OTOMIX 9.1; 7.12; 7.10 - Mother Add. 1-2; 8.3; Add. 6 - GAP-017; GAP-024
// Leaky-bucket rate limiter middleware for ingestion floods.
// Per-user scope (JWT sub). In-memory store (P10 may switch to Redis).
// Retry-After: integer seconds per RFC 9110.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';

export interface RateLimitClock {
  now(): number;
}

export interface RateLimitDeps {
  logger?: Logger;
  clock?: RateLimitClock;
  capacity?: number;
  drainPerSec?: number;
  keyOf?: (req: IncomingMessage) => string | null;
}

export interface RateLimitConfig {
  capacity: number;
  drainPerSec: number;
}

export const RATE_LIMIT_DEFAULTS: RateLimitConfig = Object.freeze({
  capacity: 10,
  drainPerSec: 1,
});

interface Bucket {
  tokens: number;
  lastRefillSec: number;
}

function defaultClock(): RateLimitClock {
  return { now: () => Date.now() / 1000 };
}

function defaultKey(req: IncomingMessage): string | null {
  // The interceptor is expected to have run first; it attaches the
  // resolved claims to req for downstream consumers. Fall back to
  // x-user-id header only if claims are absent (defensive).
  const anyReq = req as unknown as { claims?: { sub?: string } };
  const sub = anyReq.claims?.sub;
  if (typeof sub === 'string' && sub.length > 0) return sub;
  const hdr = req.headers['x-user-id'];
  if (typeof hdr === 'string' && hdr.length > 0) return hdr;
  return null;
}

export function createRateLimitMiddleware(deps: RateLimitDeps = {}) {
  const logger = deps.logger ?? createLogger({ service: 'gateway-ratelimit' });
  const clock = deps.clock ?? defaultClock();
  const capacity = deps.capacity ?? RATE_LIMIT_DEFAULTS.capacity;
  const drainPerSec = deps.drainPerSec ?? RATE_LIMIT_DEFAULTS.drainPerSec;
  const keyOf = deps.keyOf ?? defaultKey;

  const buckets = new Map<string, Bucket>();

  return function rateLimitMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: Error) => void,
  ): void {
    const key = keyOf(req);
    if (key === null) {
      // Unauthenticated: interceptor normally rejects before this point.
      // Be conservative: pass through, do not rate limit unidentified callers.
      next();
      return;
    }

    const now = clock.now();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: capacity, lastRefillSec: now };
      buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefillSec;
      if (elapsed > 0) {
        const refill = elapsed * drainPerSec;
        bucket.tokens = Math.min(capacity, bucket.tokens + refill);
        bucket.lastRefillSec = now;
      }
    }

    if (bucket.tokens < 1) {
      const deficit = 1 - bucket.tokens;
      const waitSec = Math.max(1, Math.ceil(deficit / drainPerSec));
      res.statusCode = 429;
      res.setHeader('content-type', 'application/json');
      res.setHeader('Retry-After', String(waitSec));
      res.end(JSON.stringify({ error: 'RESOURCE_EXHAUSTED', message: 'Rate limit exceeded' }));
      logger.log({
        level: 'warn',
        trace_id: 'ratelimit',
        span_id: 'ratelimit',
        event: 'ingest.ratelimited',
        outcome: 'failure',
        durationMs: 0,
        keyPrefix: key.slice(0, 8),
        waitSec,
      });
      return;
    }

    bucket.tokens -= 1;
    next();
  };
}