import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createInterceptor } from '@otomix/gateway/src/interceptor.js';

function makeServer(perms: string[]) {
  const interceptor = createInterceptor({
    verifyToken: { verify: async () => ({ sub: 'u', tenant_id: 'otomix', jti: 'j', iat: 0, exp: 0 }) },
    isDenied: async () => false,
    getEffectivePermissions: async () => new Set<string>(perms),
    expectedTenantId: 'otomix',
  });
  return http.createServer((req, res) => {
    if (!req.headers['idempotency-key']) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'INVALID_ARGUMENT', message: 'idempotency-key required' }));
      return;
    }
    interceptor(req, res, () => { res.statusCode = 201; res.end('ok'); });
  });
}

describe('X-P06-P07: ingest endpoint gates', () => {
  it('missing scope -> 403', async () => {
    const server = makeServer([]);
    const res = await request(server).post('/api/v1/ingest/local').set('Authorization', 'Bearer t').set('Idempotency-Key', 'k');
    expect(res.status).toBe(403);
  });
  it('with local:process but no Idempotency-Key -> 400', async () => {
    const server = makeServer(['local:process']);
    const res = await request(server).post('/api/v1/ingest/local').set('Authorization', 'Bearer t');
    expect(res.status).toBe(400);
  });
  it('with scope + Idempotency-Key -> 201', async () => {
    const server = makeServer(['local:process']);
    const res = await request(server).post('/api/v1/ingest/local').set('Authorization', 'Bearer t').set('Idempotency-Key', 'k');
    expect(res.status).toBe(201);
  });
});