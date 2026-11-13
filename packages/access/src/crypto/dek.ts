import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { AES_KEY_BYTES, GCM_IV_BYTES, GCM_TAG_BYTES } from '../constants';

export interface KekProvider {
  wrap(dek: Buffer): Promise<Buffer>;
  unwrap(wrapped: Buffer): Promise<Buffer>;
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
}

export class DecryptionFailedError extends Error {
  readonly code = 'DECRYPTION_FAILED' as const;
  constructor(message: string) { super(message); this.name = 'DecryptionFailedError'; }
}

export class InvalidKeyError extends Error {
  readonly code = 'INVALID_KEY' as const;
  constructor(message: string) { super(message); this.name = 'InvalidKeyError'; }
}

export class TenantKeyNotFoundError extends Error {
  readonly code = 'TENANT_KEY_NOT_FOUND' as const;
  constructor(message: string) { super(message); this.name = 'TenantKeyNotFoundError'; }
}

export interface DekService {
  getTenantDek(tenantId: string): Promise<Buffer>;
  encrypt(tenantId: string, plaintext: Buffer): Promise<EncryptedBlob>;
  decrypt(tenantId: string, encrypted: EncryptedBlob): Promise<Buffer>;
}

const ALGORITHM = 'aes-256-gcm';

export function createDekService(deps: { kekProvider: KekProvider }): DekService {
  const cache = new Map<string, Buffer>();

  async function getTenantDek(tenantId: string): Promise<Buffer> {
    const cached = cache.get(tenantId);
    if (cached) return cached;

    const dek = randomBytes(AES_KEY_BYTES);
    if (dek.length !== AES_KEY_BYTES) throw new InvalidKeyError('DEK length mismatch');
    const wrapped = await deps.kekProvider.wrap(dek);
    if (!wrapped || wrapped.length === 0) throw new InvalidKeyError('wrap returned empty');
    cache.set(tenantId, dek);
    return dek;
  }

  async function encrypt(tenantId: string, plaintext: Buffer): Promise<EncryptedBlob> {
    const dek = await getTenantDek(tenantId);
    const iv = randomBytes(GCM_IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, dek, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext, iv, tag };
  }

  async function decrypt(tenantId: string, encrypted: EncryptedBlob): Promise<Buffer> {
    const dek = await getTenantDek(tenantId);
    if (encrypted.iv.length !== GCM_IV_BYTES) throw new DecryptionFailedError('IV length mismatch');
    if (encrypted.tag.length !== GCM_TAG_BYTES) throw new DecryptionFailedError('tag length mismatch');
    try {
      const decipher = createDecipheriv(ALGORITHM, dek, encrypted.iv);
      decipher.setAuthTag(encrypted.tag);
      return Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]);
    } catch (e) {
      throw new DecryptionFailedError('authentication failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return { getTenantDek, encrypt, decrypt };
}