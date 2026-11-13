// OTOMIX §4.1 · Enrichment Pipeline (P05-ADD-T06-S03-M01)
//
// Orchestrates the per-track flow: Global Cache -> Isolated Worker -> Tenant Store.
// Uses structural ports (dependency inversion) to avoid circular dependencies
// between core, adapter, and gateway.
//
// Rule 25: Passes features through to consumers; does NOT reject or repair tracks.
// Rule 26: BOUNDARY_IO only (sampleRate in Hz, length in samples). No internal seconds.
// D14: Communicates with the worker ONLY via the Engine API Contract boundary.

export interface EngineAnalysisRequest {
  readonly pcm_buffer: string; // base64
  readonly sample_rate: number;
  readonly channels: number;
  readonly length: number;
  readonly track_id?: string;
  readonly requested_features?: string[];
}

export type EngineAnalysisResponse =
  | { status: 'success'; features: Record<string, unknown> }
  | { status: 'error'; message: string };

export interface EngineRunner {
  runAnalysis(request: EngineAnalysisRequest): Promise<EngineAnalysisResponse>;
}

export interface FeatureCache {
  get(contentSha256: string): Promise<{ contentSha256: string; rawAnalysisData: Record<string, unknown>; analysisVersion: string } | null>;
  upsert(contentSha256: string, data: Record<string, unknown>, version: string): Promise<void>;
}

export interface TenantFeatureStore {
  write(tenantId: string, trackId: string, features: Record<string, unknown>, schemaVersion: string): Promise<void>;
}

export interface EnrichmentInput {
  readonly contentSha256: string;
  readonly analysisVersion: string;
  readonly workerId: string;
  readonly tenantId: string;
  readonly pcmBufferBase64: string;
  readonly sampleRate: number;
  readonly channels: number;
  readonly length: number;
}

export interface EnrichmentResult {
  readonly cacheHit: boolean;
  readonly features: Record<string, unknown>;
  readonly analysisVersion: string;
}

export type EnrichmentOutcome =
  | { ok: true; result: EnrichmentResult }
  | { ok: false; error: 'WORKER_ERROR' | 'VALIDATION_ERROR' | 'PERSIST_ERROR'; message: string };

export interface PipelineDeps {
  readonly cache: FeatureCache;
  readonly tenantStore: TenantFeatureStore;
  readonly engine: EngineRunner;
  readonly workerRegistry: { get(id: string): { path?: string } | undefined };
}

export async function runEnrichment(
  input: EnrichmentInput,
  deps: PipelineDeps
): Promise<EnrichmentOutcome> {
  // 1. Check Global Cache
  const cached = await deps.cache.get(input.contentSha256);
  
  // 2. Cache HIT logic
  if (cached && cached.analysisVersion === input.analysisVersion) {
    return {
      ok: true,
      result: {
        cacheHit: true,
        features: cached.rawAnalysisData,
        analysisVersion: cached.analysisVersion,
      },
    };
  }

  // 3. Cache MISS (or stale version) -> resolve worker
  const worker = deps.workerRegistry.get(input.workerId);
  if (!worker) {
    return { ok: false, error: 'VALIDATION_ERROR', message: `Worker not found: ${input.workerId}` };
  }

  // 4. Run isolated worker via Engine API
  const engineReq: EngineAnalysisRequest = {
    pcm_buffer: input.pcmBufferBase64,
    sample_rate: input.sampleRate,
    channels: input.channels,
    length: input.length,
  };

  const engineRes = await deps.engine.runAnalysis(engineReq);
  if (engineRes.status === 'error') {
    return { ok: false, error: 'WORKER_ERROR', message: engineRes.message };
  }

  const features = engineRes.features;

  // 5. Persist to global first, then tenant (DQ3-a)
  try {
    await deps.cache.upsert(input.contentSha256, features, input.analysisVersion);
    await deps.tenantStore.write(input.tenantId, input.contentSha256, features, input.analysisVersion);
  } catch (e: any) {
    return { ok: false, error: 'PERSIST_ERROR', message: e.message || 'Unknown DB error' };
  }

  // 6. Return success
  return {
    ok: true,
    result: {
      cacheHit: false,
      features,
      analysisVersion: input.analysisVersion,
    },
  };
}