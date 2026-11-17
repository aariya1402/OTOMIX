// OTOMIX 5.1; 5.2; 5.3 - Mother 1 - GAP-014
import { describe, it, expect } from 'vitest';
import {
  ingestLocal,
  LocalIngestError,
} from '../src/ingest/ingest-local';
import type { LocalIngestDeps } from '../src/ingest/ingest-local';

function mockDeps(overrides: Partial<LocalIngestDeps> = {}): LocalIngestDeps {
  return {
    sniff: () => ({ format: 'mp3' }),
    checkLimits: () => {},
    decode: async () => ({
      ok: true,
      value: {
        pcm: new Float32Array(44100),
        sampleRate: 44100,
        sha256: 'abababababababababababababababababababababababababababababababab',
      },
    }),
    extractTags: () => ({ displayMetadata: { title: 'test' } }),
    ...overrides,
  };
}

describe('ingestLocal (adapter) P07-T03-S02-M02', () => {
  it('returns decoded PCM and sha256 for valid MP3', async () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x03]);
    const result = await ingestLocal(
      { bytes, filename: 'test.mp3', durationSeconds: 1 },
      mockDeps(),
    );
    expect(result.format).toBe('mp3');
    expect(result.sampleRate).toBe(44100);
    expect(result.pcm.length).toBe(44100);
    expect(result.sha256).toBe(
      'abababababababababababababababababababababababababababababababab',
    );
    expect(result.durationMs).toBe(1000);
    expect(result.displayMetadata).toEqual({ title: 'test' });
  });

  it('throws INVALID_ARGUMENT for unknown format', async () => {
    const deps = mockDeps({ sniff: () => ({ format: 'unknown' }) });
    await expect(
      ingestLocal({ bytes: new Uint8Array([0, 1]), filename: 'x.bin' }, deps),
    ).rejects.toThrow(LocalIngestError);
  });

  it('throws INVALID_ARGUMENT for oversized input', async () => {
    const deps = mockDeps({
      checkLimits: () => {
        throw new LocalIngestError('INVALID_ARGUMENT', 'Too large');
      },
    });
    await expect(
      ingestLocal(
        { bytes: new Uint8Array([0, 1, 2]), filename: 'test.mp3', durationSeconds: 999999 },
        deps,
      ),
    ).rejects.toThrow(LocalIngestError);
  });
});