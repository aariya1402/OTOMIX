import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createInterceptor, InterceptorDeps, TokenClaims } from '../src/interceptor.ts';
import { isMountedRoute } from '../src/route-table.ts';

function makeDeps(): InterceptorDeps {
  const claims: TokenClaims = {
    sub: 'sub-test',
    tenant_id: 'otomix',
    jti: 'jti-test',
    iat: 0,
    exp: 0,
  };
  return {
    verifyToken: { verify: async function () { return claims; } },
    isDenied: async function () { return false; },
    getEffectivePermissions: async function () { return new Set<string>(['user:read', 'local:process']); },
    expectedTenantId: 'otomix',
  };
}

function makeDispatcher(deps: InterceptorDeps) {
  const interceptor = createInterceptor(deps);
  return http.createServer(function (req, res) {
    const url = req.url ?? '/';
    const qIndex = url.indexOf('?');
    const pathname = qIndex >= 0 ? url.slice(0, qIndex) : url;
    const method = req.method ?? 'GET';
    if (!isMountedRoute(method, pathname)) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'route not mounted' }));
      return;
    }
    interceptor(req, res, function () { res.statusCode = 200; res.end('ok'); });
  });
}

describe('unmounted routes (P06-T04-S01-M01)', () => {
  it('POST /api/v1/ingest/ddex -> 404 (route not disclosed)', async () => {
    const server = makeDispatcher(makeDeps());
    const res = await request(server).post('/api/v1/ingest/ddex').set('Authorization', 'Bearer t');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
  it('POST /api/v1/rights/overrides -> 404', async () => {
    const server = makeDispatcher(makeDeps());
    const res = await request(server).post('/api/v1/rights/overrides').set('Authorization', 'Bearer t');
    expect(res.status).toBe(404);
  });
  it('GET /api/v1/dsr/reports -> 404', async () => {
    const server = makeDispatcher(makeDeps());
    const res = await request(server).get('/api/v1/dsr/reports').set('Authorization', 'Bearer t');
    expect(res.status).toBe(404);
  });
  it('GET /api/v1/stream/license -> 404', async () => {
    const server = makeDispatcher(makeDeps());
    const res = await request(server).get('/api/v1/stream/license').set('Authorization', 'Bearer t');
    expect(res.status).toBe(404);
  });
  it('positive control: GET /api/v1/catalog/features -> not 404', async () => {
    const server = makeDispatcher(makeDeps());
    const res = await request(server).get('/api/v1/catalog/features').set('Authorization', 'Bearer t');
    expect(res.status).not.toBe(404);
  });
});