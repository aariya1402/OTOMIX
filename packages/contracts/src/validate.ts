// OTOMIX §9.6; §4.2 · Mother Add. §1–§2; §3.2
import Ajv from 'ajv';
import schema from '../schemas/feature-registry-1.2.json';
import type { FeatureRegistryV1_2, RegistryValidationResult } from './types';

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  verbose: true,
});

// Register UUID format validator (RFC 4122)
ajv.addFormat('uuid', {
  type: 'string',
  validate: (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str),
});

const validate = ajv.compile(schema);

export function validateRegistry(input: unknown): RegistryValidationResult {
  if (validate(input)) {
    return { ok: true, value: input as FeatureRegistryV1_2 };
  }
  const errors = validate.errors ?? [];
  const msg = errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
  return { ok: false, error: 'INVALID_ARGUMENT', message: msg };
}
