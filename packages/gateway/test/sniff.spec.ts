// OTOMIX §5.2 · Mother §1 · GAP-014
import { describe, it, expect } from 'vitest';
import { sniffForGateway } from '../src/ingest/sniff';
import type { Logger } from '@otomix/core';

function mp3Fixture(): Uint8Array {
  return new Uint8Array([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xfb, 0x90, 0x00,
  ]);
}

function flacFixture(): Uint8Array {
  return new Uint8Array([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22]);
}

function wavFixture(): Uint8Array {
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
  ]);
}

function randomFixture(): Uint8Array {
  return new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
}

function mockLogger(): { logger: Logger; calls: any[] } {
  const calls: any[] = [];
  const logger = {
    log: (r: any) => { calls.push(r); },
  } as unknown as Logger;
  return { logger, calls };
}

describe('sniffForGateway — cloud wrapper (P07-T01-S01-M01)', () => {
  it('MP3 named .wav -> mp3, mismatch logged', () => {
    const { logger, calls } = mockLogger();
    const r = sniffForGateway(mp3Fixture(), 'track.wav', { logger });
    expect(r.format).toBe('mp3');
    expect(r.mismatch).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].event).toBe('ingest.ext_mismatch');
    expect(calls[0].level).toBe('warn');
    expect(calls[0].expectedExt).toBe('wav');
    expect(calls[0].detectedFormat).toBe('mp3');
    expect(typeof calls[0].trace_id).toBe('string');
    expect(typeof calls[0].span_id).toBe('string');
  });

  it('FLAC named .mp3 -> flac, mismatch logged', () => {
    const { logger, calls } = mockLogger();
    const r = sniffForGateway(flacFixture(), 'track.mp3', { logger });
    expect(r.format).toBe('flac');
    expect(r.mismatch).toBe(true);
    expect(calls.length).toBe(1);
  });

  it('WAV named .flac -> wav, mismatch logged', () => {
    const { logger, calls } = mockLogger();
    const r = sniffForGateway(wavFixture(), 'track.flac', { logger });
    expect(r.format).toBe('wav');
    expect(r.mismatch).toBe(true);
    expect(calls.length).toBe(1);
  });

  it('random bytes -> unknown, no mismatch logged', () => {
    const { logger, calls } = mockLogger();
    const r = sniffForGateway(randomFixture(), 'track.bin', { logger });
    expect(r.format).toBe('unknown');
    expect(r.mismatch).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('correct extension -> no mismatch logged', () => {
    const { logger, calls } = mockLogger();
    const r = sniffForGateway(mp3Fixture(), 'track.mp3', { logger });
    expect(r.format).toBe('mp3');
    expect(r.mismatch).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('aggregate: 3 mismatches across the 3 wrong-extension fixtures', () => {
    const { logger, calls } = mockLogger();
    sniffForGateway(mp3Fixture(), 'a.wav', { logger });
    sniffForGateway(flacFixture(), 'b.mp3', { logger });
    sniffForGateway(wavFixture(), 'c.flac', { logger });
    sniffForGateway(randomFixture(), 'd.bin', { logger });
    expect(calls.length).toBe(3);
    expect(calls.every((c) => c.event === 'ingest.ext_mismatch')).toBe(true);
  });

  it('production path (no logger injected) does not throw', () => {
    // Real createLogger + real .log(); previously threw "logger.warn is not a function"
    expect(() => {
      sniffForGateway(mp3Fixture(), 'track.wav');
    }).not.toThrow();
  });
});