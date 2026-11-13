import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createCspMiddleware, buildCspHeader, CspConfigError } from '../src/csp.ts';

function makeServer(config?: any) {
  const mw = createCspMiddleware(config);
  return http.createServer(function (req, res) {
    mw(req, res, function () { res.statusCode = 200; res.end('ok'); });
  });
}

describe('CSP middleware (P06-T05-S01-M01)', () => {
  it('(a) default header has all required directives', async () => {
    const server = makeServer();
    const res = await request(server).get('/');
    const csp = res.headers['content-security-policy'] as string;
    expect(csp).toBeTruthy();
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
  });

  it('(b) no unsafe-inline in script-src or worker-src', async () => {
    const server = makeServer();
    const res = await request(server).get('/');
    const csp = res.headers['content-security-policy'] as string;
    const scriptPart = csp.split(';').find((p) => p.trim().startsWith('script-src'));
    const workerPart = csp.split(';').find((p) => p.trim().startsWith('worker-src'));
    expect(scriptPart).not.toContain("'unsafe-inline'");
    expect(workerPart).not.toContain("'unsafe-inline'");
  });

  it('(c) no wildcard * anywhere', async () => {
    const server = makeServer();
    const res = await request(server).get('/');
    const csp = res.headers['content-security-policy'] as string;
    expect(csp).not.toContain(' *');
    expect(csp).not.toContain('*;');
    expect(csp).not.toContain("'*'");
  });

  it('(d) custom config adds cdn.example.com to script-src', async () => {
    const server = makeServer({ scriptSrc: ["'self'", 'https://cdn.example.com'] });
    const res = await request(server).get('/');
    const csp = res.headers['content-security-policy'] as string;
    expect(csp).toContain('https://cdn.example.com');
  });

  it('(e) config with unsafe-inline throws CspConfigError', () => {
    expect(() => buildCspHeader({ scriptSrc: ["'self'", "'unsafe-inline'"] })).toThrow(CspConfigError);
  });
});