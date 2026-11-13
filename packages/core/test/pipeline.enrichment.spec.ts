import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runEnrichment,
  type PipelineDeps,
  type FeatureCache,
  type TenantFeatureStore,
  type EngineRunner,
} from '../src/pipeline/enrichment';

const mockInput = {
  contentSha256: 'aaaa1111',
  analysisVersion: 'v1.0.0',
  workerId: 'essentia-worker',
  tenantId: 'otomix',
  pcmBufferBase64: 'AAAAAA==',
  sampleRate: 44100,
  channels: 2,
  length: 1024,
};

const mockFeatures = { bpm: 120, key: '8A', energy: 0.8 };
const mockWorkerPath = '/workers/essentia.wasm';

describe('runEnrichment Pipeline', () => {
  let mockCache: FeatureCache;
  let mockTenantStore: TenantFeatureStore;
  let mockEngine: EngineRunner;
  let mockRegistry: { get(id: string): { path?: string } | undefined };
  let deps: PipelineDeps;

  beforeEach(() => {
    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
    };
    mockTenantStore = {
      write: vi.fn().mockResolvedValue(undefined),
    };
    mockEngine = {
      runAnalysis: vi.fn().mockResolvedValue({ status: 'success', features: mockFeatures }),
    };
    mockRegistry = {
      get: vi.fn().mockReturnValue({ path: mockWorkerPath }),
    };
    deps = { cache: mockCache, tenantStore: mockTenantStore, engine: mockEngine, workerRegistry: mockRegistry };
  });

  it('T1: Cache HIT (matching version) -> skips worker, no writes', async () => {
    (mockCache.get as any).mockResolvedValue({
      contentSha256: mockInput.contentSha256,
      rawAnalysisData: mockFeatures,
      analysisVersion: mockInput.analysisVersion,
    });

    const outcome = await runEnrichment(mockInput, deps);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.cacheHit).toBe(true);
      expect(outcome.result.features).toEqual(mockFeatures);
    }
    expect(mockEngine.runAnalysis).not.toHaveBeenCalled();
    expect(mockCache.upsert).not.toHaveBeenCalled();
    expect(mockTenantStore.write).not.toHaveBeenCalled();
  });

  it('T2: Cache MISS -> worker called 1x, both stores written 1x', async () => {
    const outcome = await runEnrichment(mockInput, deps);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.cacheHit).toBe(false);
    }
    expect(mockEngine.runAnalysis).toHaveBeenCalledTimes(1);
    expect(mockCache.upsert).toHaveBeenCalledTimes(1);
    expect(mockTenantStore.write).toHaveBeenCalledTimes(1);
  });

  it('T3: Cache MISS + worker error -> no stores written, returns WORKER_ERROR', async () => {
    (mockEngine.runAnalysis as any).mockResolvedValue({ status: 'error', message: 'WASM panic' });

    const outcome = await runEnrichment(mockInput, deps);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toBe('WORKER_ERROR');
      expect(outcome.message).toBe('WASM panic');
    }
    expect(mockCache.upsert).not.toHaveBeenCalled();
    expect(mockTenantStore.write).not.toHaveBeenCalled();
  });

  it('T4: Stale version -> treated as MISS, worker called, global overwritten', async () => {
    (mockCache.get as any).mockResolvedValue({
      contentSha256: mockInput.contentSha256,
      rawAnalysisData: mockFeatures,
      analysisVersion: 'v0.9.0', // Stale
    });

    const outcome = await runEnrichment(mockInput, deps);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.cacheHit).toBe(false);
    }
    expect(mockEngine.runAnalysis).toHaveBeenCalledTimes(1);
    expect(mockCache.upsert).toHaveBeenCalledWith(
      mockInput.contentSha256,
      mockFeatures,
      mockInput.analysisVersion
    );
  });

  it('T5: Data integrity -> stored features deep-equal returned features', async () => {
    const outcome = await runEnrichment(mockInput, deps);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(mockCache.upsert).toHaveBeenCalledWith(
        mockInput.contentSha256,
        outcome.result.features,
        mockInput.analysisVersion
      );
    }
  });
});