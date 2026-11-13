// OTOMIX §7.1; §9.4; §9.10; §7.11
import { describe, it, expect } from 'vitest';
import { ROUTE_SCOPES, KNOWN_SCOPES } from '../src/scopes';

describe('Route Scope Registry (P06-T02-S01-M01)', () => {
  it('every route entry has method, path, and at least one scope', () => {
    for (const entry of ROUTE_SCOPES) {
      expect(typeof entry.method).toBe('string');
      expect(entry.method.length).toBeGreaterThan(0);
      expect(typeof entry.path).toBe('string');
      expect(entry.path.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.scopes)).toBe(true);
      expect(entry.scopes.length).toBeGreaterThan(0);
    }
  });

  it('no scope value equals "*"', () => {
    for (const entry of ROUTE_SCOPES) {
      for (const scope of entry.scopes) {
        expect(scope).not.toBe('*');
      }
    }
  });

  it('every declared scope appears in the KNOWN_SCOPES allow-list', () => {
    const known: readonly string[] = KNOWN_SCOPES;
    for (const entry of ROUTE_SCOPES) {
      for (const scope of entry.scopes) {
        expect(known).toContain(scope);
      }
    }
  });
});