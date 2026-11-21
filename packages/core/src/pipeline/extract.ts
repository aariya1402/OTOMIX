// OTOMIX 4.8; 9.5 - Mother 7; Add. 1-2
// extract(): adapter -> registry fields -> validate -> features + outbox in one transaction.

import type { Logger } from '../telemetry/logger.js';

export type TenantId = 'otomix' | 'otodj';

export interface ExtractedFeatures {
  bpm: number;
  camelotKey: string;
  energyScalar: number;
  energyStars: number;
  mixability: number;
  grooveMode: 'straight' | 'triplet' | 'swing';
  registryJson: Record<string, unknown>;
}

export interface ExtractRawInput {
  trackId: string;
  contentSha256: string;
  schemaVersion: string;
  rawAnalysis: unknown;
}

export interface ExtractDeps {
  persistence: ExtractPersistence;
  tenantId: TenantId;
  adapter: (raw: unknown) => Promise<ExtractedFeatures>;
  validator: (f: ExtractedFeatures) => { valid: boolean; error?: string };
  logger?: Logger;
}

export interface ExtractPersistenceInput {
  tenantId: TenantId;
  trackId: string;
  contentSha256: string;
  schemaVersion: string;
  features: ExtractedFeatures;
}

export interface ExtractPersistenceResult {
  featureId: string;
  messageId: string;
}

export interface ExtractPersistence {
  persist(input: ExtractPersistenceInput): Promise<ExtractPersistenceResult>;
}

export interface ExtractResult {
  ok: boolean;
  featureId?: string;
  messageId?: string;
  error?: string;
}

export interface ExtractBatchResult {
  succeeded: number;
  failed: number;
  results: ExtractResult[];
}

export async function extractOne(input: ExtractRawInput, deps: ExtractDeps): Promise<ExtractResult> {
  let features: ExtractedFeatures;
  try {
    features = await deps.adapter(input.rawAnalysis);
  } catch (err) {
    return { ok: false, error: 'ADAPTER: ' + (err as Error).message };
  }
  const v = deps.validator(features);
  if (!v.valid) {
    return { ok: false, error: 'INVALID: ' + (v.error ?? 'unknown') };
  }

  try {
    const persisted = await deps.persistence.persist({
      tenantId: deps.tenantId,
      trackId: input.trackId,
      contentSha256: input.contentSha256,
      schemaVersion: input.schemaVersion,
      features,
    });
    return { ok: true, ...persisted };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function extract(inputs: ExtractRawInput[], deps: ExtractDeps): Promise<ExtractBatchResult> {
  let succeeded = 0, failed = 0;
  const results: ExtractResult[] = [];
  for (const input of inputs) {
    const r = await extractOne(input, deps);
    results.push(r);
    if (r.ok) succeeded++; else failed++;
  }
  return { succeeded, failed, results };
}