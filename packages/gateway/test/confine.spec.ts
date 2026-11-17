// OTOMIX §5.2 · Mother §1 · GAP-014 · GAP-017
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { confineForGateway } from '../src/ingest/confine';
import type { Logger } from '@otomix/core';

function mockLogger(): { logger: Logger; calls: any[] } {
  const calls: any[] = [];
  return {
    logger: { log: (r: any) => { calls.push(r); } } as unknown as Logger,
    calls,
  };
}

let root: string;
let outside: string;
let symlinkPath: string;
let canSymlink = true;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'otomix-confine-root-'));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'otomix-confine-out-'));
  fs.mkdirSync(path.join(root, 'subdir'));
  fs.writeFileSync(path.join(root, 'subdir', 'file.wav'), Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]));
  symlinkPath = path.join(root, 'escape');
  try { fs.symlinkSync(outside, symlinkPath, 'junction'); }
  catch {
    try { fs.symlinkSync(outside, symlinkPath); }
    catch { canSymlink = false; }
  }
});

afterAll(() => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  try { fs.rmSync(outside, { recursive: true, force: true }); } catch {}
});

describe('confineForGateway (P07-T01-S02-M02)', () => {
  it('rejects ../ traversal (ENOENT outside root) -> NOT_FOUND', () => {
    const { logger, calls } = mockLogger();
    const r = confineForGateway('../../etc/passwd', { logger, grantedRoot: root });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INVALID_ARGUMENT');
    expect(calls.length).toBe(1);
    expect(calls[0].event).toBe('ingest.confine_rejected');
  });

  it('rejects symlink escape -> SYMLINK_ESCAPE (skip if no symlink privileges)', () => {
    if (!canSymlink) { console.warn('SKIP: cannot create symlink on this host'); return; }
    const { logger, calls } = mockLogger();
    const r = confineForGateway('escape', { logger, grantedRoot: root });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('SYMLINK_ESCAPE');
    expect(calls.length).toBe(1);
  });

  it('accepts nested valid path', () => {
    const { logger, calls } = mockLogger();
    const r = confineForGateway(path.join('subdir', 'file.wav'), { logger, grantedRoot: root });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.realPath).toContain('subdir');
    expect(calls.length).toBe(0);
  });

  it('missing INGEST_ROOT -> rejected', () => {
    const saved = process.env.INGEST_ROOT;
    delete process.env.INGEST_ROOT;
    const r = confineForGateway('subdir/file.wav', {});
    if (saved !== undefined) process.env.INGEST_ROOT = saved;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('NOT_FOUND');
  });

  it('production path (no logger injected) does not throw', () => {
    expect(() => confineForGateway('../../etc/passwd', { grantedRoot: root })).not.toThrow();
  });
});