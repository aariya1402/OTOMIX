// OTOMIX §9.9; §7.2 · Mother Add. §1–§2; §5.2
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import {
  createReceiverDedupStore,
  sign,
  ReceiverDedupStore,
  SignedMessage,
} from '../src/receiver-dedup';

const SECRET = 'test-secret';
const TENANT = 'otomix';

let redis: InstanceType<typeof RedisMock>;
let store: ReceiverDedupStore;

function makeMessage(
  messageId: string,
  sequence: bigint,
  payload: Uint8Array = new Uint8Array([1, 2, 3]),
): SignedMessage {
  return {
    messageId,
    tenantId: TENANT,
    sequence,
    payload,
    signature: sign(SECRET, messageId, TENANT, sequence, payload),
  };
}

beforeEach(() => {
  redis = new RedisMock();
  store = createReceiverDedupStore({ redis: redis as any, hmacSecret: SECRET });
});

afterEach(async () => {
  await store.close();
});

describe('receiver dedup store', () => {
  it('accepts a fresh message, then drops a duplicate message_id', async () => {
    const msg = makeMessage('msg-1', 1n);

    const first = await store.processMessage(msg);
    expect(first.status).toBe('accepted');

    const second = await store.processMessage(msg);
    expect(second.status).toBe('duplicate');
  });

  it('rejects out-of-order sequence and rolls back the dedup claim', async () => {
    // Accept seq=5 first.
    const ok = await store.processMessage(makeMessage('msg-5', 5n));
    expect(ok.status).toBe('accepted');

    // Now send seq=4 for the same tenant with a different message_id.
    const bad = await store.processMessage(makeMessage('msg-4', 4n));
    expect(bad.status).toBe('out_of_order');
    if (bad.status === 'out_of_order') {
      expect(bad.expected).toBe(6n);
    }

    // CRITICAL: dedup key for msg-4 must be rolled back so a retry works.
    const dedupKey = `otomix:dedup:${TENANT}:msg-4`;
    const stillThere = await redis.get(dedupKey);
    expect(stillThere).toBeNull();

    // Retry with correct sequence → accepted.
    const retry = await store.processMessage(makeMessage('msg-4', 6n));
    expect(retry.status).toBe('accepted');
  });

  it('rejects a tampered signature and writes NO dedup record', async () => {
    const msg = makeMessage('msg-7', 7n);
    // Flip one bit in the signature.
    const tampered: SignedMessage = {
      ...msg,
      signature: Buffer.from(msg.signature),
    };
    tampered.signature[0] = tampered.signature[0]! ^ 0xff;

    const result = await store.processMessage(tampered);
    expect(result.status).toBe('invalid_signature');

    // Confirm no dedup key was written.
    const dedupKey = `otomix:dedup:${TENANT}:msg-7`;
    const written = await redis.get(dedupKey);
    expect(written).toBeNull();
  });
});