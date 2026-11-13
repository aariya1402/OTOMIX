// OTOMIX §2.9; §7.1; §7.4; §9.3; §9.4
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createInterceptor, InterceptorDeps, TokenClaims } from '../src/interceptor';

function makeDeps(
  scopes: string[],
  opts?: { tenantId?: string; denied?: boolean },
): InterceptorDeps {
  const claims: TokenClaims = {
    sub: 'sub-test',
    tenant_id: opts?.tenantId ?? 'otomix',
    scopes: scopes,
    tier: 1,
    jti: 'jti-test',
    iat: 0,
    exp: 0,
  };
  return {
    verifyToken: {
      verify: async function () {
        return claims;
      },
    },
    isDenied: async function () {
      return opts?.denied ?? false;
    },
    expectedTenantId: 'otomix',
  };
}

function makeServer(deps: InterceptorDeps) {
  const interceptor = createInterceptor(deps);
  return http.createServer(function (req, res) {
    interceptor(req, res, function () {
      res.statusCode = 200;
      res.end('ok');
    });
  });
}

describe('gateway interceptor (P06-T02-S01-M03)', () => {
  it('200 when granted scope includes dsp:*', async () => {
    const server = makeServer(makeDeps(['dsp:*']));
    const res = await request(server)
      .patch('/api/v1/dsp/parameters')
      .set('Authorization', 'Bearer token-x');
    expect(res.status).toBe(200);
  });

  it('200 when granted scope includes audio:tuning', async () => {
    const server = makeServer(makeDeps(['audio:tuning']));
    const res = await request(server)
      .patch('/api/v1/dsp/parameters')
      .set('Authorization', 'Bearer token-x');
    expect(res.status).toBe(200);
  });

  it('403 when granted scope is only sys:*', async () => {
    const server = makeServer(makeDeps(['sys:*']));
    const res = await request(server)
      .patch('/api/v1/dsp/parameters')
      .set('Authorization', 'Bearer token-x');
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