import { describe, it, expect } from 'vitest';
import { createDekService } from '../src/crypto/dek';
import {
  InMemoryDekStore,
  InMemoryVersionedKekProvider,
  shouldRotate,
  rotateAllDeks,
} from '../src/crypto/rotate';

function makeLegacyKek() {
  return {
    async wrap(dek: Buffer): Promise<Buffer> { return Buffer.concat([Buffer.alloc(32, 0x42), dek]); },
    async unwrap(_w: Buffer): Promise<Buffer> { throw new Error('not used'); },
  };
}

describe('KEK rotation (P06-T04-S02-M03)', () => {
  it('(a) shouldRotate: false for fresh, true after 91 days', async () => {
    const store = new InMemoryDekStore();
    const now = new Date('2026-11-13T00:00:00Z');
    const fresh = new Date('2026-11-12T00:00:00Z');
    const old = new Date('2026-08-01T00:00:00Z');

    await store.set('tenant-a', Buffer.alloc(60), 1, fresh);
    expect(await shouldRotate(store, now)).toBe(false);

    const store2 = new InMemoryDekStore();
    await store2.set('tenant-b', Buffer.alloc(60), 1, old);
    expect(await shouldRotate(store2, now)).toBe(true);
  });

  it('(b) rotateAllDeks re-wraps DEKs; old blobs still decrypt', async () => {
    const store = new InMemoryDekStore();
    const kek = new InMemoryVersionedKekProvider();

    const svc1 = createDekService({ kekProvider: makeLegacyKek(), store, versionedKek: kek });
    const plaintext = Buffer.from('audio-blob');
    const encrypted = await svc1.encrypt('tenant-a', plaintext);
    const oldEntry = await store.get('tenant-a');
    expect(oldEntry).not.toBeNull();
    expect(oldEntry!.kekVersion).toBe(1);

    const newVersion = kek.bumpVersion();
    expect(newVersion).toBe(2);

    const result = await rotateAllDeks({ store, kek });
    expect(result.rotated).toBe(1);
    expect(result.failed.length).toBe(0);
    expect(result.newKekVersion).toBe(2);

    const newEntry = await store.get('tenant-a');
    expect(newEntry!.kekVersion).toBe(2);

    const svc2 = createDekService({ kekProvider: makeLegacyKek(), store, versionedKek: kek });
    const decrypted = await svc2.decrypt('tenant-a', encrypted);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('(c) rotateAllDeks is idempotent (re-rotating preserves ciphertext)', async () => {
    const store = new InMemoryDekStore();
    const kek = new InMemoryVersionedKekProvider();
    const svc1 = createDekService({ kekProvider: makeLegacyKek(), store, versionedKek: kek });
    const plaintext = Buffer.from('blob2');
    const encrypted = await svc1.encrypt('tenant-a', plaintext);

    kek.bumpVersion();
    await rotateAllDeks({ store, kek });
    kek.bumpVersion();
    await rotateAllDeks({ store, kek });

    const finalEntry = await store.get('tenant-a');
    expect(finalEntry!.kekVersion).toBe(3);

    const svc2 = createDekService({ kekProvider: makeLegacyKek(), store, versionedKek: kek });
    const decrypted = await svc2.decrypt('tenant-a', encrypted);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('(d) partial failure: valid tenant rotates, invalid-version tenant fails', async () => {
    const store = new InMemoryDekStore();
    const kek = new InMemoryVersionedKekProvider();

    // tenant-a: valid DEK wrapped with version 1
    const realDek = Buffer.alloc(32, 0x11);
    const wrappedA = await kek.wrap(realDek);
    await store.set('tenant-a', wrappedA.wrapped, wrappedA.version, new Date());

    // tenant-b: invalid wrapped blob + nonexistent version 999
    await store.set('tenant-b', Buffer.alloc(60), 999, new Date());

    kek.bumpVersion();
    const result = await rotateAllDeks({ store, kek });

    expect(result.rotated).toBe(1);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].tenantId).toBe('tenant-b');
  });
});