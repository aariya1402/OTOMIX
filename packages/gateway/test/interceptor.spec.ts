import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createInterceptor, InterceptorDeps, TokenClaims } from '../src/interceptor';

function makeDeps(perms: string[], opts?: { tenantId?: string; denied?: boolean }): InterceptorDeps {
  const claims: TokenClaims = {
    sub: 'sub-test',
    tenant_id: opts?.tenantId ?? 'otomix',
    jti: 'jti-test',
    iat: 0,
    exp: 0,
  };
  return {
    verifyToken: { verify: async function () { return claims; } },
    isDenied: async function () { return opts?.denied ?? false; },
    getEffectivePermissions: async function () { return new Set<string>(perms); },
    expectedTenantId: 'otomix',
  };
}

function makeServer(deps: InterceptorDeps) {
  const interceptor = createInterceptor(deps);
  return http.createServer(function (req, res) {
    interceptor(req, res, function () { res.statusCode = 200; res.end('ok'); });
  });
}

describe('gateway interceptor (RBAC-M11)', () => {
  it('200 when effective perms include dsp:*', async () => {
    const server = makeServer(makeDeps(['dsp:*']));
    const res = await request(server).patch('/api/v1/dsp/parameters').set('Authorization', 'Bearer token-x');
    expect(res.status).toBe(200);
  });
  it('200 when effective perms include audio:tuning', async () => {
    const server = makeServer(makeDeps(['audio:tuning']));
    const res = await request(server).patch('/api/v1/dsp/parameters').set('Authorization', 'Bearer token-x');
    expect(res.status).toBe(200);
  });
  it('403 when effective perms have only sys:*', async () => {
    const server = makeServer(makeDeps(['sys:*']));
    const res = await request(server).patch('/api/v1/dsp/parameters').set('Authorization', 'Bearer token-x');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });
  it('401 when Authorization header is missing', async () => {
    const server = makeServer(makeDeps(['dsp:*']));
    const res = await request(server).patch('/api/v1/dsp/parameters');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHENTICATED');
  });
});