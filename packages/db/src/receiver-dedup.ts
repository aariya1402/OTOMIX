// OTOMIX §9.9; §7.2 · Mother Add. §1–§2; §5.2
// Receiver dedup store: message_id uniqueness + per-tenant monotonic sequence
// + signature verification BEFORE any dedup write.
import { createHmac, timingSafeEqual } from 'node:crypto';
import Redis from 'ioredis';

const DEFAULT_PREFIX = 'otomix:dedup:';
const DEFAULT_TTL = 86400; // 24 h
const SEQ_KEY_TTL = 86400;

export type ReceiverDedupResult =
  | { status: 'accepted'; messageId: string; tenantId: string; sequence: bigint }
  | { status: 'duplicate' }
  | { status: 'out_of_order'; expected: bigint }
  | { status: 'invalid_signature' }
  | { status: 'malformed' };

export interface SignedMessage {
  messageId: string;
  tenantId: string;
  sequence: bigint;
  /** Opaque payload; the receiver does not interpret it. */
  payload: Uint8Array;
  /** HMAC-SHA256 over the canonical JSON (sorted keys, no signature). */
  signature: Uint8Array;
}

export interface ReceiverDedupConfig {
  redis: Redis;
  hmacSecret: Buffer | string;
  prefix?: string;
  ttlSeconds?: number;
}

export interface ReceiverDedupStore {
  processMessage(msg: SignedMessage): Promise<ReceiverDedupResult>;
  close(): Promise<void>;
}

/**
 * Canonical bytes for signing. Sorted keys, deterministic JSON.
 * Excludes the signature itself.
 */
export function canonicalize(
  messageId: string,
  tenantId: string,
  sequence: bigint,
  payload: Uint8Array,
): Buffer {
  const canonical = JSON.stringify({
    message_id: messageId,
    payload_b64: Buffer.from(payload).toString('base64'),
    sequence: sequence.toString(),
    tenant_id: tenantId,
  });
  return Buffer.from(canonical, 'utf8');
}

export function sign(
  secret: Buffer | string,
  messageId: string,
  tenantId: string,
  sequence: bigint,
  payload: Uint8Array,
): Buffer {
  return createHmac('sha256', secret)
    .update(canonicalize(messageId, tenantId, sequence, payload))
    .digest();
}

function verifySignature(
  secret: Buffer | string,
  msg: SignedMessage,
): boolean {
  const expected = sign(secret, msg.messageId, msg.tenantId, msg.sequence, msg.payload);
  const provided = Buffer.from(msg.signature);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function createReceiverDedupStore(
  config: ReceiverDedupConfig,
): ReceiverDedupStore {
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const ttl = config.ttlSeconds ?? DEFAULT_TTL;
  const secret = config.hmacSecret;

  return {
    async processMessage(msg: SignedMessage): Promise<ReceiverDedupResult> {
      // 1. Malformed check (basic)
      if (!msg.messageId || !msg.tenantId) {
        return { status: 'malformed' };
      }

      // 2. Signature verification MUST precede any dedup write.
      if (!verifySignature(secret, msg)) {
        return { status: 'invalid_signature' };
      }

      // 3. Claim dedup key atomically.
      const dedupKey = `${prefix}${msg.tenantId}:${msg.messageId}`;
      const claimed = await config.redis.set(
        dedupKey, msg.sequence.toString(), 'EX', ttl, 'NX');
      if (claimed !== 'OK') {
        return { status: 'duplicate' };
      }

      // 4. Sequence check (per-tenant monotonic, strict >).
      const seqKey = `${prefix}seq:${msg.tenantId}`;
      const lastRaw = await config.redis.get(seqKey);
      const last = lastRaw ? BigInt(lastRaw) : 0n;

      if (msg.sequence <= last) {
        // Rollback the dedup claim so a retry can succeed.
        await config.redis.del(dedupKey);
        return { status: 'out_of_order', expected: last + 1n };
      }

      // 5. Record new sequence.
      await config.redis.set(seqKey, msg.sequence.toString(), 'EX', SEQ_KEY_TTL);

      return {
        status: 'accepted',
        messageId: msg.messageId,
        tenantId: msg.tenantId,
        sequence: msg.sequence,
      };
    },

    async close(): Promise<void> {
      await config.redis.quit();
    },
  };
}