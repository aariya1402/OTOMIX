// P07-T02-S01-M04 - Metadata enrichment via consent-gated tags + external API/library
import { describe, it, expect } from 'vitest';
import { enrichMetadata } from '../../src/ingest/metadata-enrichment';

describe('enrichMetadata (consent-gated)', () => {
  // Fixture 1: consent + tags + external
  it('consent=true, rawTags present, external present -> embedded baseline enriched by external (missing only)', () => {
    const input = {
      rawTags: { title: 'Tag Title', artist: 'Tag Artist', bpm: 128 },
      consent: true,
      external: { title: 'Ext Title', album: 'Ext Album', key: '8A' },
    };
    const result = enrichMetadata(input);
    expect(result.title).toBe('Tag Title');
    expect(result.artist).toBe('Tag Artist');
    expect(result.bpm).toBe(128);
    expect(result.album).toBe('Ext Album');
    expect(result.key).toBe('8A');
    expect(result.comment).toBeUndefined();
  });

  // Fixture 2: consent + tags, no external
  it('consent=true, rawTags present, external=null -> embedded baseline returned as-is', () => {
    const input = {
      rawTags: { title: 'Tag Title', artist: 'Tag Artist', album: 'Tag Album' },
      consent: true,
      external: null,
    };
    const result = enrichMetadata(input);
    expect(result.title).toBe('Tag Title');
    expect(result.artist).toBe('Tag Artist');
    expect(result.album).toBe('Tag Album');
    expect(result.bpm).toBeUndefined();
    expect(result.key).toBeUndefined();
    expect(result.comment).toBeUndefined();
  });

  // Fixture 3: no consent + tags + external
  it('consent=false, rawTags present, external present -> only non-PII fields, no PII from tags', () => {
    const input = {
      rawTags: { title: 'Tag Title', artist: 'Tag Artist', album: 'Tag Album', comment: 'Tag Comment' },
      consent: false,
      external: { title: 'Ext Title', bpm: 128, key: '8A' },
    };
    const result = enrichMetadata(input);
    expect(result.title).toBe('Ext Title');
    expect(result.bpm).toBe(128);
    expect(result.key).toBe('8A');
    expect(result.artist).toBeUndefined();
    expect(result.album).toBeUndefined();
    expect(result.comment).toBeUndefined();
  });

  // Fixture 4: no consent, no tags, external present (with PII)
  it('consent=false, rawTags=null, external present -> only non-PII from external', () => {
    const input = {
      rawTags: null,
      consent: false,
      external: { title: 'Ext Title', artist: 'Ext Artist', bpm: 128 },
    };
    const result = enrichMetadata(input);
    expect(result.title).toBe('Ext Title');
    expect(result.bpm).toBe(128);
    expect(result.artist).toBeUndefined();
    expect(result.album).toBeUndefined();
    expect(result.key).toBeUndefined();
    expect(result.comment).toBeUndefined();
  });
});