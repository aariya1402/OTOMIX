import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { createAuthTelegramRoutes } from '../src/routes/auth-telegram.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';

const TEST_TIMEOUT = 120_000;

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i < 0 ? raw : raw.slice(0, i);
}

function makeTelegramData(overrides: Record<string, string> = {}, botToken = 'test-bot-token'): Record<string, string> {
  const base = {
    id: '123456789',
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    photo_url: 'https://example.com/photo.jpg',
    auth_date: Math.floor(Date.now() / 1000).toString(),
  };
  const data = { ...base, ...overrides };
  
  // Compute hash
  const { hash: _, ...checkData } = data;
  const dataCheckString = Object.keys(checkData)
    .sort()
    .map(k => `${k}=${checkData[k]}`)
    .join('\n');
  const secretKey = createHmac('sha256', botToken).update('WebAppData').digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return { ...data, hash };
}

describe('Telegram Auth (P07-REG-M03)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let routes: ReturnType<typeof createAuthTelegramRoutes>;
  let redisMock: Map<string, string>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test').withUsername('test').withPassword('test').start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query(loadUp('001_core.sql'));
    await pool.query(loadUp('002_rls.sql'));
    await pool.query(loadUp('008_registration.sql'));

    redisMock = new Map();
    const redis = {
      get: async (key: string) => redisMock.get(key) || null,
      setex: async (key: string, _ttl: number, value: string) => { redisMock.set(key, value); },
      getdel: async (key: string) => { const v = redisMock.get(key); redisMock.delete(key); return v; },
    } as any;

    routes = createAuthTelegramRoutes({
      pool,
      redis,
      botToken: 'test-bot-token',
      vault: {
        issueAccessToken: async (claims: any) => ({ token: 'mock-token-' + claims.sub }),
      } as any,
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  const mockReq = (method: string, url: string, body?: any) => ({
    method,
    url,
    headers: { host: 'localhost', 'content-type': 'application/json' },
    [Symbol.asyncIterator]: async function* () {
      if (body) yield JSON.stringify(body);
    },
  });

  const mockRes = () => {
    let status = 200;
    let body = '';
    const res: any = {
      writeHead: (s: number) => { status = s; },
      end: (b: string) => { body = b; },
      get status() { return status; },
      get body() { return body; },
    };
    return res;
  };

  it('valid telegram data -> creates user and returns token', async () => {
    const data = makeTelegramData();
    const req = mockReq('POST', '/auth/telegram/verify', data);
    const res = mockRes();
    
    await routes['/auth/telegram/verify'](req, res);
    
    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.user_id).toBeDefined();
    expect(parsed.access_token).toBe('mock-token-' + parsed.user_id);
  });

  it('invalid hash -> 401', async () => {
    const data = makeTelegramData({ hash: 'invalid-hash' });
    const req = mockReq('POST', '/auth/telegram/verify', data);
    const res = mockRes();
    
    await routes['/auth/telegram/verify'](req, res);
    expect(res.status).toBe(401);
  });

  it('expired auth_date -> 401', async () => {
    const data = makeTelegramData({ auth_date: (Math.floor(Date.now() / 1000) - 90000).toString() });
    const req = mockReq('POST', '/auth/telegram/verify', data);
    const res = mockRes();
    
    await routes['/auth/telegram/verify'](req, res);
    expect(res.status).toBe(401);
  });

  it('missing telegram id -> 400', async () => {
    const data = makeTelegramData({ id: '' });
    const req = mockReq('POST', '/auth/telegram/verify', data);
    const res = mockRes();
    
    await routes['/auth/telegram/verify'](req, res);
    expect(res.status).toBe(400);
  });

  it('duplicate telegram_id returns same user', async () => {
    const data = makeTelegramData({ id: '999999999' });
    const req1 = mockReq('POST', '/auth/telegram/verify', data);
    const res1 = mockRes();
    await routes['/auth/telegram/verify'](req1, res1);
    
    const req2 = mockReq('POST', '/auth/telegram/verify', data);
    const res2 = mockRes();
    await routes['/auth/telegram/verify'](req2, res2);
    
    const u1 = JSON.parse(res1.body).user_id;
    const u2 = JSON.parse(res2.body).user_id;
    expect(u1).toBe(u2);
  });
});