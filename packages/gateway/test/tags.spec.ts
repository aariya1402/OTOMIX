// OTOMIX §5.2 · Mother §1 · GAP-007 · GAP-014 · GAP-017
import { describe, it, expect } from 'vitest';
import { extractTagsForGateway } from '../src/ingest/tags';
import { BPM, CamelotKey } from '@otomix/core';
import type { Logger } from '@otomix/core';

function mockLogger(): { logger: Logger; calls: any[] } {
  const calls: any[] = [];
  return {
    logger: { log: (r: any) => { calls.push(r); } } as unknown as Logger,
    calls,
  };
}

function buildWavWithListInfo(entries: Array<[string, string]>): Uint8Array {
  const info: number[] = [];
  const push = (s: string) => { for (let i = 0; i < s.length; i++) info.push(s.charCodeAt(i)); };
  const pushU32LE = (v: number) => { info.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff); };
  push('INFO');
  for (const [id, val] of entries) {
    push(id);
    const len = val.length + 1;
    pushU32LE(len);
    push(val);
    info.push(0);
    if (len & 1) info.push(0);
  }
  const full: number[] = [];
  const pushF = (s: string) => { for (let i = 0; i < s.length; i++) full.push(s.charCodeAt(i)); };
  const pushU32F = (v: number) => { full.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff); };
  pushF('RIFF'); pushU32F(4 + 8 + info.length); pushF('WAVE');
  pushF('LIST'); pushU32F(info.length);
  for (const b of info) full.push(b);
  return new Uint8Array(full);
}

describe('extractTagsForGateway (P07-T02-S01-M03)', () => {
  it('tag BPM=999, key=99Z stored in displayMetadata, never used for registry', () => {
    const { logger, calls } = mockLogger();
    const bytes = buildWavWithListInfo([
      ['INAM', 'Tag Title'],
      ['IART', 'Artist Name'],
      ['ICBP', '999'],
      ['IKEY', '99Z'],
    ]);
    const r = extractTagsForGateway(bytes, 'wav', { logger });

    // Display metadata has tag values (test spec requires this).
    expect(r.displayMetadata.bpm).toBe(999);
    expect(r.displayMetadata.key).toBe('99Z');
    expect(r.hasPii).toBe(true);

    // Registry-safety: tag BPM 999 fails validator; analysis BPM 128 passes.
    const tagBpm = r.displayMetadata.bpm as number;
    expect(BPM.parse(tagBpm).ok).toBe(false);
    expect(BPM.parse(128).ok).toBe(true);

    const tagKey = r.displayMetadata.key as string;
    expect(CamelotKey.parse(tagKey).ok).toBe(false);
    expect(CamelotKey.parse('8A').ok).toBe(true);

    // Registry payload is built from analysis, not from displayMetadata.
    const registryPayload = { bpm: 128, camelot_key: '8A' };
    expect(registryPayload.bpm).not.toBe(999);
    expect(registryPayload.camelot_key).not.toBe('99Z');

    // Logger fired for PII.
    expect(calls.length).toBe(1);
    expect(calls[0].event).toBe('ingest.tags_stripped');
    expect(calls[0].level).toBe('warn');
    expect(calls[0].outcome).toBe('partial');
  });

  it('no PII tags -> no log', () => {
    const { logger, calls } = mockLogger();
    const bytes = buildWavWithListInfo([['INAM', 'Clean Title'], ['ICBP', '128']]);
    const r = extractTagsForGateway(bytes, 'wav', { logger });
    expect(r.displayMetadata.bpm).toBe(128);
    expect(r.hasPii).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('production path (no logger) does not throw', () => {
    const bytes = buildWavWithListInfo([['IART', 'Someone']]);
    expect(() => extractTagsForGateway(bytes, 'wav')).not.toThrow();
  });
});