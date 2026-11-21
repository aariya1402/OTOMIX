import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { createAuthEmailOtpRoutes, FakeEmailProvider } from '../src/routes/auth-email-otp.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@otomix/access', () => ({
  issueAccessToken: async (claims: { sub: string }) => ({
    token: 'mock-token-' + claims.sub,
  }),
}));

const TEST_TIMEOUT = 300_000;

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i < 0 ? raw : raw.slice(0, i);
}

describe('Email OTP Auth', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let routes: ReturnType<typeof createAuthEmailOtpRoutes>;
  let email: FakeEmailProvider;
  let redisMock: Map<string, { value: string; expiry: number }>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test').withUsername('test').withPassword('test').start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query(loadUp('001_core.sql'));
    await pool.query(loadUp('002_rls.sql'));
    await pool.query(loadUp('008_registration.sql'));

    email = new FakeEmailProvider();
    redisMock = new Map();
    const redis = {
      get: async (key: string) => {
        const entry = redisMock.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiry) { redisMock.delete(key); return null; }
        return entry.value;
      },
      setex: async (key: string, ttl: number, value: string) => {
        redisMock.set(key, { value, expiry: Date.now() + ttl * 1000 });
      },
      getdel: async (key: string) => {
        const entry = redisMock.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiry) { redisMock.delete(key); return null; }
        redisMock.delete(key);
        return entry.value;
      },
      incr: async (key: string) => {
        const entry = redisMock.get(key);
        const val = entry ? parseInt(entry.value, 10) + 1 : 1;
        redisMock.set(key, { value: String(val), expiry: entry?.expiry || Date.now() + 600000 });
        return val;
      },
      ttl: async (key: string) => {
        const entry = redisMock.get(key);
        if (!entry) return -2;
        const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
      },
    } as any;

    routes = createAuthEmailOtpRoutes({
      pool,
      redis,
      email,
      vault: {
        issueAccessToken: async (claims: any) => ({ token: 'mock-token-' + claims.sub }),
      } as any,
      rateLimitMax: 3,
      rateLimitWindowSec: 600,
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  }, TEST_TIMEOUT);

  const mockReq = (method: string, body: any) => ({
    method,
    url: '',
    headers: { host: 'localhost', 'content-type': 'application/json' },
    [Symbol.asyncIterator]: async function* () { yield JSON.stringify(body); },
  });

  const mockRes = () => {
    let status = 200;
    let body = '';
    const res: any = {
      writeHead: (s: number, h?: any) => { status = s; },
      end: (b: string) => { body = b; },
      get status() { return status; },
      get body() { return body; },
    };
    return res;
  };

  it('send: valid email + terms -> sends OTP, returns ttl', async () => {
    const req = mockReq('POST', { email: 'test@example.com', terms_version: 'v1.0' });
    const res = mockRes();
    await routes['/auth/email/send'](req, res);
    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.sent).toBe(true);
    expect(parsed.ttl_sec).toBe(120);
    expect(email.sent.length).toBe(1);
    expect(email.sent[0].email).toBe('test@example.com');
    expect(email.sent[0].code.length).toBe(6);
  });

  it('send: invalid email format -> 400', async () => {
    const req = mockReq('POST', { email: 'invalid-email', terms_version: 'v1.0' });
    const res = mockRes();
    await routes['/auth/email/send'](req, res);
    expect(res.status).toBe(400);
  });

  it('send: missing terms_version -> 400', async () => {
    const req = mockReq('POST', { email: 'test@example.com' });
    const res = mockRes();
    await routes['/auth/email/send'](req, res);
    expect(res.status).toBe(400);
  });

  it('send: rate limit (4th request) -> 429 with Retry-After', async () => {
    const emailAddr = 'ratelimit@example.com';
    for (let i = 0; i < 3; i++) {
      const req = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
      const res = mockRes();
      await routes['/auth/email/send'](req, res);
      expect(res.status).toBe(200);
    }
    const req4 = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
    const res4 = mockRes();
    await routes['/auth/email/send'](req4, res4);
    expect(res4.status).toBe(429);
    expect(res4.body).toContain('Rate limit');
  });

  it('verify: valid code -> creates user, returns token', async () => {
    const emailAddr = 'verify@example.com';
    const sendReq = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
    const sendRes = mockRes();
    await routes['/auth/email/send'](sendReq, sendRes);
    const sentCode = email.sent[email.sent.length - 1].code;

    const verifyReq = mockReq('POST', { email: emailAddr, code: sentCode, terms_version: 'v1.0' });
    const verifyRes = mockRes();
    await routes['/auth/email/verify'](verifyReq, verifyRes);
    expect(verifyRes.status).toBe(200);
    const parsed = JSON.parse(verifyRes.body);
    expect(parsed.user_id).toBeDefined();
    expect(parsed.access_token).toBe('mock-token-' + parsed.user_id);
  });

  it('verify: wrong code -> 401', async () => {
    const emailAddr = 'wrong@example.com';
    const sendReq = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
    const sendRes = mockRes();
    await routes['/auth/email/send'](sendReq, sendRes);

    const verifyReq = mockReq('POST', { email: emailAddr, code: 'WRONG1', terms_version: 'v1.0' });
    const verifyRes = mockRes();
    await routes['/auth/email/verify'](verifyReq, verifyRes);
    expect(verifyRes.status).toBe(401);
  });

  it('verify: expired code (after getdel) -> 401', async () => {
    const emailAddr = 'expired@example.com';
    const sendReq = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
    const sendRes = mockRes();
    await routes['/auth/email/send'](sendReq, sendRes);
    const sentCode = email.sent[email.sent.length - 1].code;

    const verifyReq1 = mockReq('POST', { email: emailAddr, code: sentCode, terms_version: 'v1.0' });
    const verifyRes1 = mockRes();
    await routes['/auth/email/verify'](verifyReq1, verifyRes1);
    expect(verifyRes1.status).toBe(200);

    const verifyReq2 = mockReq('POST', { email: emailAddr, code: sentCode, terms_version: 'v1.0' });
    const verifyRes2 = mockRes();
    await routes['/auth/email/verify'](verifyReq2, verifyRes2);
    expect(verifyRes2.status).toBe(401);
  });

  it('verify: duplicate email returns same user', async () => {
    const emailAddr = 'duplicate@example.com';
    const sendReq = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
    const sendRes = mockRes();
    await routes['/auth/email/send'](sendReq, sendRes);
    const code = email.sent[email.sent.length - 1].code;

    const v1 = mockReq('POST', { email: emailAddr, code, terms_version: 'v1.0' });
    const r1 = mockRes();
    await routes['/auth/email/verify'](v1, r1);
    const u1 = JSON.parse(r1.body).user_id;

    const sendReq2 = mockReq('POST', { email: emailAddr, terms_version: 'v1.0' });
    const sendRes2 = mockRes();
    await routes['/auth/email/send'](sendReq2, sendRes2);
    const code2 = email.sent[email.sent.length - 1].code;

    const v2 = mockReq('POST', { email: emailAddr, code: code2, terms_version: 'v1.0' });
    const r2 = mockRes();
    await routes['/auth/email/verify'](v2, r2);
    const u2 = JSON.parse(r2.body).user_id;
    expect(u1).toBe(u2);
  });
});
