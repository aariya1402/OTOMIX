// OTOMIX §9.3 · Mother Add. §1–§2
import { describe, it, expect } from 'vitest';
import { validateIdempotencyKey } from '../src/idempotency/validate';

function createMockRes() {
  let statusCode = 200;
  let body: string | null = null;
  const res = {
    get statusCode() { return statusCode; },
    set statusCode(v: number) { statusCode = v; },
    setHeader: () => {},
    writeHead: () => {},
    end: (chunk: string) => { body = chunk; },
    write: (chunk: string) => { body = chunk; },
    get body() { return body; },
  };
  return res;
}

function createMockReq(method: string, headers: Record<string, string | undefined>) {
  return { method, headers } as unknown as Parameters<typeof validateIdempotencyKey>[0];
}

describe('Idempotency-Key validation middleware', () => {
  it('returns 400 for missing Idempotency-Key header on POST', () => {
    const res = createMockRes();
    const req = createMockReq('POST', {});

    validateIdempotencyKey(req, res as any, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('INVALID_ARGUMENT');
  });

  it('returns 400 for UUIDv1 on POST', () => {
    const res = createMockRes();
    const req = createMockReq('POST', { 'idempotency-key': '6ba7b810-9dad-11d1-80b4-00c04fd430c8' });

    validateIdempotencyKey(req, res as any, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('INVALID_ARGUMENT');
  });

  it('passes through for valid UUIDv4 on POST', () => {
    let nextCalled = false;
    const res = createMockRes();
    const req = createMockReq('POST', { 'idempotency-key': '123e4567-e89b-42d3-a456-426614174000' });

    validateIdempotencyKey(req, res as any, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
  });

  it('passes through for GET without Idempotency-Key', () => {
    let nextCalled = false;
    const res = createMockRes();
    const req = createMockReq('GET', {});

    validateIdempotencyKey(req, res as any, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('passes through for HEAD without Idempotency-Key', () => {
    let nextCalled = false;
    const res = createMockRes();
    const req = createMockReq('HEAD', {});

    validateIdempotencyKey(req, res as any, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
  });

  it('returns 400 for missing Idempotency-Key on PUT/PATCH/DELETE', () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const res = createMockRes();
      const req = createMockReq(method, {});

      validateIdempotencyKey(req, res as any, () => {});

      expect(res.statusCode).toBe(400);
      expect(res.body).toContain('INVALID_ARGUMENT');
    }
  });
});
