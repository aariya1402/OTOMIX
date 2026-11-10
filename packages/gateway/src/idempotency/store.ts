// OTOMIX §9.3 · Mother Add. §1–§2
// Redis-backed idempotency store with SET NX claim + 24h TTL + fingerprint replay.
import Redis from 'ioredis';

const TTL_SECONDS = 86400;
const PREFIX = 'otomix:idem:';
const POLL_INTERVAL_MS = 50;
const POLL_TIMEOUT_MS = 5000;
const MAX_CLAIM_RETRIES = 3;

export type IdempotencyStatus = 'fresh' | 'replay' | 'conflict';

export interface IdempotencyResult<T> {
  status: IdempotencyStatus;
  response?: T;
}

export interface StoredRecord {
  fingerprint: string;
  status: 'in_progress' | 'completed';
  response?: unknown;
}

export interface IdempotencyStore {
  withIdempotency<T>(
    key: string,
    fingerprint: string,
    handler: () => Promise<T>,
  ): Promise<IdempotencyResult<T>>;
  getResponse(key: string): Promise<StoredRecord | null>;
  getTTL(key: string): Promise<number>;
  close(): Promise<void>;
}

type ClaimResult = 'fresh' | StoredRecord | null;

const redisKeyFor = (key: string): string => `${PREFIX}${key}`;

async function attemptClaim(
  redis: Redis,
  key: string,
  fingerprint: string,
): Promise<ClaimResult> {
  const rk = redisKeyFor(key);
  const marker: StoredRecord = { fingerprint, status: 'in_progress' };
  const claimed = await redis.set(rk, JSON.stringify(marker), 'NX', 'EX', TTL_SECONDS);
  if (claimed === 'OK') return 'fresh';
  const raw = await redis.get(rk);
  if (!raw) return null;
  return JSON.parse(raw) as StoredRecord;
}

export function createIdempotencyStore(redis: Redis): IdempotencyStore {
  return {
    async withIdempotency<T>(
      key: string,
      fingerprint: string,
      handler: () => Promise<T>,
    ): Promise<IdempotencyResult<T>> {
      const rk = redisKeyFor(key);

      // 1. Try to claim the key (SET NX). Retry a few times if key vanished between NX and GET.
      let claim: ClaimResult = null;
      for (let i = 0; i < MAX_CLAIM_RETRIES; i++) {
        claim = await attemptClaim(redis, key, fingerprint);
        if (claim !== null) break;
      }
      if (claim === null) {
        return { status: 'conflict' };
      }

      // 2. Fresh claim: run handler, persist completed response, return fresh.
      if (claim === 'fresh') {
        try {
          const response = await handler();
          const record: StoredRecord = { fingerprint, status: 'completed', response };
          await redis.set(rk, JSON.stringify(record), 'EX', TTL_SECONDS);
          return { status: 'fresh', response };
        } catch (err) {
          await redis.del(rk);
          throw err;
        }
      }

      // 3. Existing key: compare fingerprint.
      if (claim.fingerprint !== fingerprint) {
        return { status: 'conflict' };
      }
      if (claim.status === 'completed') {
        return { status: 'replay', response: claim.response as T };
      }

      // 4. In-progress + same fingerprint: poll until completed (bounded).
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const raw = await redis.get(rk);
        if (!raw) return { status: 'conflict' };
        const data = JSON.parse(raw) as StoredRecord;
        if (data.fingerprint !== fingerprint) return { status: 'conflict' };
        if (data.status === 'completed') {
          return { status: 'replay', response: data.response as T };
        }
      }
      return { status: 'conflict' };
    },

    async getResponse(key: string): Promise<StoredRecord | null> {
      const raw = await redis.get(redisKeyFor(key));
      if (!raw) return null;
      return JSON.parse(raw) as StoredRecord;
    },

    async getTTL(key: string): Promise<number> {
      return redis.ttl(redisKeyFor(key));
    },

    async close(): Promise<void> {
      await redis.quit();
    },
  };
}