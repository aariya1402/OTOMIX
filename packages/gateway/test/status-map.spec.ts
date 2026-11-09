// OTOMIX §9.3 · Mother Add. §1–§2
import { describe, it, expect } from 'vitest';
import { mapStatus } from '../src/status-map';

describe('gRPC to HTTP Status Map', () => {
  it('maps INVALID_ARGUMENT to 400', () => {
    expect(mapStatus('INVALID_ARGUMENT')).toBe(400);
  });

  it('maps UNAUTHENTICATED to 401', () => {
    expect(mapStatus('UNAUTHENTICATED')).toBe(401);
  });

  it('maps PERMISSION_DENIED to 403', () => {
    expect(mapStatus('PERMISSION_DENIED')).toBe(403);
  });

  it('maps NOT_FOUND to 404', () => {
    expect(mapStatus('NOT_FOUND')).toBe(404);
  });

  it('maps ABORTED to 409', () => {
    expect(mapStatus('ABORTED')).toBe(409);
  });

  it('maps ALREADY_EXISTS to 409', () => {
    expect(mapStatus('ALREADY_EXISTS')).toBe(409);
  });

  it('maps RESOURCE_EXHAUSTED to 429', () => {
    expect(mapStatus('RESOURCE_EXHAUSTED')).toBe(429);
  });

  it('maps DEADLINE_EXCEEDED to 504', () => {
    expect(mapStatus('DEADLINE_EXCEEDED')).toBe(504);
  });

  it('maps UNAVAILABLE to 503', () => {
    expect(mapStatus('UNAVAILABLE')).toBe(503);
  });

  it('maps INTERNAL to 500', () => {
    expect(mapStatus('INTERNAL')).toBe(500);
  });

  it('falls back to 500 for unknown codes', () => {
    expect(mapStatus('UNKNOWN_CODE')).toBe(500);
  });
});
