// OTOMIX 4.8; 9.5 - GAP-022
import { describe, it, expect, vi } from 'vitest';
import { extract } from '../src/pipeline/extract';
import type { ExtractedFeatures, ExtractRawInput } from '../src/pipeline/extract';

function goodFeatures(): ExtractedFeatures {
  return {
    bpm: 120,
    camelotKey: '1A',
    energyScalar: 0.5,
    energyStars: 3,
    mixability: 0.5,
    grooveMode: 'straight',
    registryJson: {},
  };
}

describe('extract() orchestrator (P05-T04-S01-M01)', () => {
  it('maps and persists valid features', async () => {
    const inputs: ExtractRawInput[] = [
      { trackId: '11111111-1111-1111-1111-111111111111', contentSha256: 'aa', schemaVersion: '1.2.0', rawAnalysis: { i: 1 } },
      { trackId: '22222222-2222-2222-2222-222222222222', contentSha256: 'bb', schemaVersion: '1.2.0', rawAnalysis: { i: 2 } },
    ];
    const persist = vi.fn(async ({ trackId }: { trackId: string }) => ({
      featureId: 'feature-' + trackId,
      messageId: 'message-' + trackId,
    }));

    const result = await extract(inputs, {
      persistence: { persist },
      tenantId: 'otomix',
      adapter: async () => goodFeatures(),
      validator: () => ({ valid: true }),
    });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(result.results[0].featureId).toBe('feature-11111111-1111-1111-1111-111111111111');
  });

  it('rejects invalid features without persistence', async () => {
    const persist = vi.fn();
    const r = await extract(
      [{ trackId: '44444444-4444-4444-4444-444444444444', contentSha256: 'dd', schemaVersion: '1.2.0', rawAnalysis: {} }],
      {
        persistence: { persist },
        tenantId: 'otomix',
        adapter: async () => goodFeatures(),
        validator: () => ({ valid: false, error: 'bpm out of range' }),
      },
    );
    expect(r.failed).toBe(1);
    expect(r.results[0].error).toContain('INVALID');
    expect(persist).not.toHaveBeenCalled();
  });
});