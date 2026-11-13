import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { KEY_ROTATION_DAYS } from '../constants';
import type { DekStore, VersionedKekProvider } from './dek';

const DAY_MS = 24 * 60 * 60 * 1000;
const AES_KEY_BYTES = 32;

export interface RotationResult {
  rotated: number;
  failed: Array<{ tenantId: string; error: string }>;
  newKekVersion: number;
}

export class InMemoryDekStore implements DekStore {
  private readonly map = new Map<string, { wrappedDek: Buffer; kekVersion: number; createdAt: Date }>();

  async get(tenantId: string) {
    const e = this.map.get(tenantId);
    return e ? { ...e } : null;
  }
  async set(tenantId: string, wrappedDek: Buffer, kekVersion: number, createdAt?: Date) {
    this.map.set(tenantId, { wrappedDek, kekVersion, createdAt: createdAt ?? new Date() });
  }
  async listAll() {
    return Array.from(this.map.entries()).map(([tenantId, e]) => ({ tenantId, ...e }));
  }
}

export class InMemoryVersionedKekProvider implements VersionedKekProvider {
  private readonly keys = new Map<number, Buffer>();
  private version = 1;

  constructor() {
    this.keys.set(1, randomBytes(32));
  }

  bumpVersion(): number {
    const next = this.version + 1;
    this.keys.set(next, randomBytes(32));
    this.version = next;
    return next;
  }

  currentVersion(): number { return this.version; }

  async wrap(dek: Buffer): Promise<{ wrapped: Buffer; version: number }> {
    const kek = this.keys.get(this.version);
    if (!kek) throw new Error('no KEK for current version');
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', kek, iv);
    const ct = Buffer.concat([c.update(dek), c.final()]);
    const tag = c.getAuthTag();
    return { wrapped: Buffer.concat([iv, tag, ct]), version: this.version };
  }

  async unwrap(wrapped: Buffer, version: number): Promise<Buffer> {
    const kek = this.keys.get(version);
    if (!kek) throw new Error('no KEK for version ' + version);
    const iv = wrapped.subarray(0, 12);
    const tag = wrapped.subarray(12, 28);
    const ct = wrapped.subarray(28);
    const d = createDecipheriv('aes-256-gcm', kek, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
  }
}

export async function shouldRotate(store: DekStore, now: Date = new Date()): Promise<boolean> {
  const entries = await store.listAll();
  const thresholdMs = KEY_ROTATION_DAYS * DAY_MS;
  for (const e of entries) {
    if (now.getTime() - e.createdAt.getTime() >= thresholdMs) return true;
  }
  return false;
}

export async function rotateTenantDek(
  tenantId: string,
  deps: { store: DekStore; kek: VersionedKekProvider },
  now: Date = new Date(),
): Promise<void> {
  const entry = await deps.store.get(tenantId);
  if (!entry) throw new Error('no DEK for tenant ' + tenantId);
  const dek = await deps.kek.unwrap(entry.wrappedDek, entry.kekVersion);
  if (dek.length !== AES_KEY_BYTES) throw new Error('unwrapped DEK length mismatch');
  const wrapped = await deps.kek.wrap(dek);
  await deps.store.set(tenantId, wrapped.wrapped, wrapped.version, now);
}

export async function rotateAllDeks(
  deps: { store: DekStore; kek: VersionedKekProvider },
  now: Date = new Date(),
): Promise<RotationResult> {
  const entries = await deps.store.listAll();
  const failed: Array<{ tenantId: string; error: string }> = [];
  let rotated = 0;
  for (const e of entries) {
    try {
      await rotateTenantDek(e.tenantId, deps, now);
      rotated++;
    } catch (err) {
      failed.push({ tenantId: e.tenantId, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { rotated, failed, newKekVersion: deps.kek.currentVersion() };
}