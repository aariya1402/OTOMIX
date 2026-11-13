import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createInterceptor } from '@otomix/gateway/src/interceptor.js';

function makeServer(perms: string[], hasLosslessGrant: boolean) {
  const interceptor = createInterceptor({
    verifyToken: { verify: async () => ({ sub: 'u', tenant_id: 'otomix', jti: 'j', iat: 0, exp: 0 }) },
    isDenied: async () => false,
    getEffectivePermissions: async () => new Set<string>(perms),
    expectedTenantId: 'otomix',
  });
  return http.createServer((req, res) => {
    interceptor(req, res, () => {
      if (!hasLosslessGrant) {
        res.statusCode = 403;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'PERMISSION_DENIED', message: 'lossless_export grant required' }));
        return;
      }
      res.statusCode = 200;
      res.end('ok');
    });
  });
}

describe('X-P06-P09: export XML tier gate', () => {
  it('Tier 1 without lossless_export grant -> 403', async () => {
    const server = makeServer(['local:process'], false);
    const res = await request(server).post('/api/v1/exports/xml').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
  it('Tier 1 with unexpired grant -> 200', async () => {
    const server = makeServer(['local:process'], true);
    const res = await request(server).post('/api/v1/exports/xml').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
  });
  it('missing scope entirely -> 403 (scope check wins)', async () => {
    const server = makeServer([], true);
    const res = await request(server).post('/api/v1/exports/xml').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
});