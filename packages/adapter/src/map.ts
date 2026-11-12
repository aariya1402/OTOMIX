// OTOMIX §4.1 · §9.8 — Map engine-specific JSON to Feature Registry v1.2
// with Draft 7 validation and SemVer gating.

import {
  validateRegistry,
  validateSchemaVersion,
  type FeatureRegistryV1_2,
} from '@otomix/contracts';

export type MapResult =
  | { ok: true; value: FeatureRegistryV1_2 }
  | { ok: false; reason: 'SCHEMA_INVALID'; message: string }
  | { ok: false; reason: 'PURGE_AND_REANALYZE'; from: string; to: string }
  | { ok: false; reason: 'SEMVER_REJECT'; from: string; to: string };

const TARGET_MINOR = '1.2.x';

export function mapEngineToRegistry(input: unknown): MapResult {
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof (input as { schema_version?: unknown }).schema_version !== 'string'
  ) {
    return {
      ok: false,
      reason: 'SCHEMA_INVALID',
      message: 'input must be an object with a string schema_version field',
    };
  }

  const version = (input as { schema_version: string }).schema_version;

  // SemVer gate FIRST (before AJV). A v2.0.0 payload would fail the v1.2
  // schema_version pattern and produce a misleading SCHEMA_INVALID;
  // running the gate first yields the intended PURGE_AND_REANALYZE.
  const gate = validateSchemaVersion(version);
  if (gate.ok === false) {
    if (gate.action === 'PURGE_AND_REANALYZE') {
      return { ok: false, reason: 'PURGE_AND_REANALYZE', from: version, to: TARGET_MINOR };
    }
    return { ok: false, reason: 'SEMVER_REJECT', from: version, to: TARGET_MINOR };
  }

  const validated = validateRegistry(input);
  if (validated.ok === false) {
    return { ok: false, reason: 'SCHEMA_INVALID', message: validated.message };
  }

  return { ok: true, value: validated.value };
}