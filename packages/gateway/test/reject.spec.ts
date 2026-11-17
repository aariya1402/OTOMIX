// OTOMIX §5.3 · Mother §1 · GAP-014 · GAP-017
import { describe, it, expect } from 'vitest';
import { rejectForGateway } from '../src/ingest/reject';
import type { Logger } from '@otomix/core';

function mockLogger(): { logger: Logger; calls: any[] } {
  const calls: any[] = [];
  return {
    logger: { log: (r: any) => { calls.push(r); } } as unknown as Logger,
    calls,
  };
}

describe('rejectForGateway (P07-T02-S01-M02)', () => {
  it('truncated WAV header -> TRUNCATED_HEADER, retryable=false, logged', () => {
    const { logger, calls } = mockLogger();
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]); // 'RIFF' only, 8 bytes
    const r = rejectForGateway('wav', bytes, 'could not decode wav', { logger });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('INVALID_ARGUMENT');
    expect(r.retryable).toBe(false);
    expect(r.reason).toBe('TRUNCATED_HEADER');
    expect(calls.length).toBe(1);
    expect(calls[0].level).toBe('warn');
    expect(calls[0].event).toBe('ingest.rejected');
    expect(calls[0].retryable).toBe(false);
    expect(calls[0].reason).toBe('TRUNCATED_HEADER');
  });

  it('MP3 with invalid frame sync -> INVALID_FRAME_SYNC', () => {
    const { logger, calls } = mockLogger();
    // 100 bytes of 0x00 — no ID3, no sync anywhere in first 4KB.
    const bytes = new Uint8Array(100);
    const r = rejectForGateway('mp3', bytes, 'could not decode mp3', { logger });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('INVALID_ARGUMENT');
    expect(r.retryable).toBe(false);
    expect(r.reason).toBe('INVALID_FRAME_SYNC');
    expect(calls.length).toBe(1);
  });

  it('FLAC with bad STREAMINFO -> BAD_STREAMINFO', () => {
    const { logger, calls } = mockLogger();
    // 'fLaC' + metadata header with blockLen != 34 (say 0x10 = 16).
    const bytes = new Uint8Array(64);
    bytes[0] = 0x66; bytes[1] = 0x4c; bytes[2] = 0x61; bytes[3] = 0x43; // fLaC
    bytes[4] = 0x00; // last=0, type=0 (STREAMINFO)
    bytes[5] = 0x00; bytes[6] = 0x00; bytes[7] = 0x10; // blockLen = 16 (should be 34)
    const r = rejectForGateway('flac', bytes, 'could not decode flac', { logger });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('INVALID_ARGUMENT');
    expect(r.retryable).toBe(false);
    expect(r.reason).toBe('BAD_STREAMINFO');
    expect(calls.length).toBe(1);
  });

  it('production path (no logger) does not throw', () => {
    const bytes = new Uint8Array(8);
    expect(() => rejectForGateway('wav', bytes)).not.toThrow();
  });

  it('3 rejections -> 3 log events aggregate', () => {
    const { logger, calls } = mockLogger();
    rejectForGateway('wav', new Uint8Array(8), undefined, { logger });
    rejectForGateway('mp3', new Uint8Array(100), undefined, { logger });
    rejectForGateway('flac', new Uint8Array(64), undefined, { logger });
    expect(calls.length).toBe(3);
    expect(calls.every((c) => c.event === 'ingest.rejected')).toBe(true);
    expect(calls.every((c) => c.retryable === false)).toBe(true);
  });
});