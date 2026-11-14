import { describe, it, expect } from 'vitest';
import { extractTags } from '../../src/ingest/tags';

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

describe('extractTags (core)', () => {
  it('WAV LIST-INFO: all fields extracted including bpm/key', () => {
    const bytes = buildWavWithListInfo([
      ['INAM', 'Title'],
      ['IART', 'Artist'],
      ['ICMT', 'Comment'],
      ['ICBP', '999'],
      ['IKEY', '99Z'],
    ]);
    const r = extractTags(bytes, 'wav');
    expect(r.displayMetadata.title).toBe('Title');
    expect(r.displayMetadata.artist).toBe('Artist');
    expect(r.displayMetadata.comment).toBe('Comment');
    expect(r.displayMetadata.bpm).toBe(999);
    expect(r.displayMetadata.key).toBe('99Z');
    expect(r.hasPii).toBe(true);
  });

  it('empty input -> no metadata, no PII', () => {
    const r = extractTags(new Uint8Array(0), 'wav');
    expect(r.displayMetadata).toEqual({});
    expect(r.hasPii).toBe(false);
  });
});