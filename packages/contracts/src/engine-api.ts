// OTOMIX §4.1 · Owner decision D14 (2026-11-12)
// Library-agnostic analysis engine contract.
// Defines the JSON payloads for the castle-and-moat isolation boundary.

import Ajv from 'ajv';
import schema from '../schemas/analysis-engine-api.json' with { type: 'json' };

export interface AnalysisEngineRequest {
  pcm_buffer: string; // base64
  sample_rate: number;
  channels: number;
  length: number;
  track_id?: string;
  requested_features?: string[];
}

export type AnalysisEngineResponse =
  | { status: 'success'; features: Record<string, unknown> }
  | { status: 'error'; message: string };

export type AnalysisEngineValidationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string };

const ajv = new Ajv({ strict: false, allErrors: true, verbose: true });
ajv.addFormat('uuid', {
  type: 'string',
  validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
});

// Compile root (Request)
const validateRequest = ajv.compile(schema);

// Compile Response subschema
// (Accessing .definitions is safe because we typed the imported json)
const responseSchema = (schema as any).definitions.AnalysisEngineResponse;
const validateResponse = ajv.compile(responseSchema);

function formatErrors(errors: any[] | null | undefined): string {
  if (!errors || errors.length === 0) return 'Unknown validation error';
  return errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
}

export function validateAnalysisEngineRequest(input: unknown): AnalysisEngineValidationResult {
  if (validateRequest(input)) {
    return { ok: true, value: input };
  }
  return { ok: false, error: 'INVALID_ARGUMENT', message: formatErrors(validateRequest.errors) };
}

export function validateAnalysisEngineResponse(input: unknown): AnalysisEngineValidationResult {
  if (validateResponse(input)) {
    return { ok: true, value: input };
  }
  return { ok: false, error: 'INVALID_ARGUMENT', message: formatErrors(validateResponse.errors) };
}