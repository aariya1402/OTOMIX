import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type * as Access from '@otomix/access';
import type { VaultClient } from '@otomix/access';
import { createAuthOtpRoutes, FakeSmsProvider } from '../src/routes/auth-otp.js';
import type { OtpRedis } from '../src/routes/auth-otp.js';

vi.mock('@otomix/access', async (importOriginal) => {
  const actual = await importOriginal<typeof Access>();
  return {
    ...actual,
    issueAccessToken: (input: Parameters<typeof Access.issueAccessToken>[0]) => Promise.resolve({
        token: `mock-token-${input.sub}`,
        claims: {
          sub: input.sub,
          tenant_id: 'otomix',
          jti: '00000000-0000-0000-0000-000000000000',
          iat: 0,
          exp: 0,
        },
        kid: 'mock-kid',
      }),
  };
});

const TEST_TIMEOUT = 180_000;

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const downIndex = raw.indexOf('-- Down');
  return downIndex < 0 ? raw : raw.slice(0, downIndex);
}

function loadDown(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const downIndex = raw.indexOf('-- Down');
  if (downIndex < 0) throw new Error(`Migration has no down section: ${rel}`);
  return raw.slice(downIndex + '-- Down'.length);
}

describe('registration terms acceptance (P07-REG-M05)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let routes: ReturnType<typeof createAuthOtpRoutes>;
  let sms: FakeSmsProvider;
  let redisData: Map<string, { value: string; expiry: number }>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query(loadUp('001_core.sql'));
    await pool.query(loadUp('002_rls.sql'));
    await pool.query(loadUp('007_tracks_source_declarations.sql'));
    await pool.query(loadUp('008_registration.sql'));
    await pool.query(loadUp('010_source_declaration_registration_scope.sql'));

    redisData = new Map();
    const redis: OtpRedis = {
      get: (key: string) => {
        const entry = redisData.get(key);
        if (!entry || Date.now() > entry.expiry) return Promise.resolve(null);
        return Promise.resolve(entry.value);
      },
      setex: (key: string, ttl: number, value: string) => {
        redisData.set(key, { value, expiry: Date.now() + ttl * 1000 });
        return Promise.resolve('OK');
      },
      getdel: (key: string) => {
        const entry = redisData.get(key);
        redisData.delete(key);
        if (!entry || Date.now() > entry.expiry) return Promise.resolve(null);
        return Promise.resolve(entry.value);
      },
      incr: (key: string) => {
        const entry = redisData.get(key);
        const value = (entry ? Number.parseInt(entry.value, 10) : 0) + 1;
        redisData.set(key, { value: String(value), expiry: entry?.expiry ?? Date.now() + 600_000 });
        return Promise.resolve(value);
      },
      ttl: (key: string) => {
        const entry = redisData.get(key);
        return Promise.resolve(entry ? Math.max(0, Math.ceil((entry.expiry - Date.now()) / 1000)) : -2);
      },
    };

    sms = new FakeSmsProvider();
    const vault: VaultClient = {
      getCurrentKid: () => Promise.resolve('mock-kid'),
      getSigningKey: () => Promise.resolve('mock-key'),
      getJwks: () => Promise.resolve({ keys: [] }),
    };
    routes = createAuthOtpRoutes({
      pool,
      redis,
      sms,
      vault,
      rateLimitMax: 3,
      rateLimitWindowSec: 600,
    });
  }, TEST_TIMEOUT);

  it('reapplies registration scope after a clean rollback', async () => {
    await pool.query(loadDown('010_source_declaration_registration_scope.sql'));
    await pool.query(loadUp('010_source_declaration_registration_scope.sql'));
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  function mockReq(body: Record<string, string>): IncomingMessage {
    const req = Readable.from([JSON.stringify(body)]) as IncomingMessage;
    req.method = 'POST';
    req.url = '';
    req.headers = { host: 'localhost', 'content-type': 'application/json' };
    return req;
  }

  function mockRes(): ServerResponse & { readonly status: number; readonly body: string } {
    let status = 200;
    let body = '';
    return {
      writeHead: (code: number) => { status = code; },
      end: (text: string) => { body = text; },
      get status() { return status; },
      get body() { return body; },
    } as ServerResponse & { readonly status: number; readonly body: string };
  }

  it('rejects verification without terms_version before creating a user', async () => {
    const res = mockRes();
    await routes['/auth/otp/verify'](
      mockReq({ phone_e164: '+989100000001', code: 'ABC123' }),
      res,
    );

    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: 'INVALID_ARGUMENT',
      message: 'terms_version required',
    });
    const users = await pool.query('SELECT user_id FROM users WHERE phone_e164 = $1', ['+989100000001']);
    expect(users.rows).toHaveLength(0);
  }, TEST_TIMEOUT);

  it('persists registration acceptance once and returns 201 only on creation', async () => {
    const phone = '+989100000002';
    const send = async () => {
      const res = mockRes();
      await routes['/auth/otp/send'](mockReq({ phone_e164: phone, terms_version: 'v1.0' }), res);
      expect(res.status).toBe(200);
      return sms.sent[sms.sent.length - 1].code;
    };
    const verify = async (code: string) => {
      const res = mockRes();
      await routes['/auth/otp/verify'](
        mockReq({ phone_e164: phone, code, terms_version: 'v1.0' }),
        res,
      );
      return res;
    };

    const first = await verify(await send());
    expect(first.status).toBe(201);
    const userId = (JSON.parse(first.body) as { user_id: string }).user_id;
    const user = await pool.query<{ terms_version: string; terms_accepted_at: Date }>(
      'SELECT terms_version, terms_accepted_at FROM users WHERE user_id = $1',
      [userId],
    );
    expect(user.rows).toHaveLength(1);
    expect(user.rows[0].terms_version).toBe('v1.0');
    expect(user.rows[0].terms_accepted_at).toBeInstanceOf(Date);

    const second = await verify(await send());
    expect(second.status).toBe(200);
    expect((JSON.parse(second.body) as { user_id: string }).user_id).toBe(userId);

    const declarations = await pool.query<{ scope: string; terms_version: string }>(
      'SELECT scope, terms_version FROM source_declarations WHERE user_id = $1',
      [userId],
    );
    expect(declarations.rows).toEqual([{ scope: 'register', terms_version: 'v1.0' }]);
  }, TEST_TIMEOUT);

  it('prevents rollback while registration declarations exist', async () => {
    await expect(
      pool.query(loadDown('010_source_declaration_registration_scope.sql')),
    ).rejects.toThrow('Cannot remove register scope while registration declarations exist');
    const declarations = await pool.query<{ scope: string }>(
      'SELECT scope FROM source_declarations WHERE scope = $1',
      ['register'],
    );
    expect(declarations.rows).toHaveLength(1);
  }, TEST_TIMEOUT);

  it('does not accept a terms version different from the one attached to the OTP', async () => {
    const phone = '+989100000003';
    const sendRes = mockRes();
    await routes['/auth/otp/send'](
      mockReq({ phone_e164: phone, terms_version: 'v1.0' }),
      sendRes,
    );
    const code = sms.sent[sms.sent.length - 1].code;
    const verifyRes = mockRes();
    await routes['/auth/otp/verify'](
      mockReq({ phone_e164: phone, code, terms_version: 'v2.0' }),
      verifyRes,
    );

    expect(verifyRes.status).toBe(401);
    const users = await pool.query('SELECT user_id FROM users WHERE phone_e164 = $1', [phone]);
    expect(users.rows).toHaveLength(0);
  }, TEST_TIMEOUT);
});
