import { describe, it, expect } from 'vitest';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { createDekService, KekProvider, DecryptionFailedError } from '../src/crypto/dek';

const FIXED_KEK = Buffer.alloc(32, 0x42);

const kekProvider: KekProvider = {
  async wrap(dek: Buffer): Promise<Buffer> {
    const iv = Buffer.alloc(12, 0x01);
    const c = createCipheriv('aes-256-gcm', FIXED_KEK, iv);
    const ct = Buffer.concat([c.update(dek), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), ct]);
  },
  async unwrap(wrapped: Buffer): Promise<Buffer> {
    const iv = wrapped.subarray(0, 12);
    const tag = wrapped.subarray(12, 28);
    const ct = wrapped.subarray(28);
    const d = createDecipheriv('aes-256-gcm', FIXED_KEK, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
  },
};

describe('DEK service (P06-T04-S02-M02)', () => {
  it('(a) encrypt with tenant A, decrypt with A -> success', async () => {
    const svc = createDekService({ kekProvider });
    const plaintext = Buffer.from('hello otomix');
    const enc = await svc.encrypt('tenant-a', plaintext);
    const dec = await svc.decrypt('tenant-a', enc);
    expect(dec.equals(plaintext)).toBe(true);
  });

  it('(b) encrypt with A, decrypt with B -> DecryptionFailedError', async () => {
    const svc = createDekService({ kekProvider });
    const plaintext = Buffer.from('secret');
    const enc = await svc.encrypt('tenant-a', plaintext);
    await expect(svc.decrypt('tenant-b', enc)).rejects.toBeInstanceOf(DecryptionFailedError);
  });

  it('(c) 100 encryptions, all IVs unique', async () => {
    const svc = createDekService({ kekProvider });
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const enc = await svc.encrypt('tenant-a', Buffer.from('x' + i));
      seen.add(enc.iv.toString('hex'));
    }
    expect(seen.size).toBe(100);
  });

  it('(d) tampered ciphertext -> DecryptionFailedError', async () => {
    const svc = createDekService({ kekProvider });
    const plaintext = Buffer.from('tamper');
    const enc = await svc.encrypt('tenant-a', plaintext);
    enc.ciphertext[0] = enc.ciphertext[0] ^ 0xff;
    await expect(svc.decrypt('tenant-a', enc)).rejects.toBeInstanceOf(DecryptionFailedError);
  });
});