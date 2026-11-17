import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type SchemaNode = {
  type?: string;
  required?: string[];
  properties?: Record<string, SchemaNode>;
  enum?: unknown[];
  items?: SchemaNode;
  oneOf?: SchemaNode[];
  anyOf?: SchemaNode[];
};

const schemaPath = resolve(process.cwd(), 'packages/core/src/dsp/port.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as SchemaNode;
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function buildValid(node: SchemaNode | undefined): unknown {
  if (!node) return null;
  if (node.enum && node.enum.length > 0) return node.enum[0];
  if (node.oneOf && node.oneOf.length > 0) return buildValid(node.oneOf[0]);
  if (node.anyOf && node.anyOf.length > 0) return buildValid(node.anyOf[0]);
  switch (node.type) {
    case 'number': return 0.5;
    case 'integer': return 1;
    case 'string': return 'x';
    case 'boolean': return true;
    case 'null': return null;
    case 'array': return [];
    case 'object': {
      const obj: Record<string, unknown> = {};
      const req = node.required ?? [];
      const props = node.properties ?? {};
      for (const k of req) obj[k] = buildValid(props[k]);
      return obj;
    }
    default: return null;
  }
}

const entry: SchemaNode = (schema.type === 'array' && schema.items)
  ? schema.items
  : (schema.oneOf && schema.oneOf[0] ? schema.oneOf[0] : schema);

describe('DspPort AudioParamAutomation schema (P04-T04-S01-M01)', () => {
  it('accepts a valid automation entry derived from the schema', () => {
    const valid = buildValid(entry);
    const ok = validate(valid);
    if (!ok) {
      throw new Error('valid fixture rejected: ' + ajv.errorsText(validate.errors));
    }
    expect(ok).toBe(true);
  });

  it('rejects an entry missing a required field (time)', () => {
    const valid = buildValid(entry) as Record<string, unknown>;
    const required = entry.required && entry.required.length > 0
      ? entry.required
      : Object.keys(entry.properties ?? {});
    if (required.length === 0) {
      throw new Error('schema has no required fields to drop');
    }
    const toDrop = required.find((k) => /time/i.test(k)) ?? required[0];
    delete valid[toDrop];
    expect(validate(valid)).toBe(false);
  });

  it('rejects an entry with an unknown curve', () => {
    const valid = buildValid(entry) as Record<string, unknown>;
    const props = entry.properties ?? {};
    const enumField = Object.keys(props).find((k) => {
      const p = props[k];
      return !!p && Array.isArray(p.enum) && p.enum.length > 0;
    });
    if (!enumField) {
      throw new Error('schema has no enum field (curve) to corrupt');
    }
    valid[enumField] = '__unknown_curve__';
    expect(validate(valid)).toBe(false);
  });
});