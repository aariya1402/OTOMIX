import { describe, it, expect } from 'vitest';
import { validateRegistry } from '../src/validate';

describe('X-P01-P05: Adapter Boundary', () => {
  it('rejects invalid fixture', () => {
    // Minimal invalid fixture missing required fields
    const fixture = { schema_version: '1.2.0' };
    const result = validateRegistry(fixture);
    expect(result.ok).toBe(false);
  });
  it('rejects v1.3.0', () => {
    const fixture = { schema_version: '1.3.0' };
    const result = validateRegistry(fixture);
    expect(result.ok).toBe(false);
  });
});