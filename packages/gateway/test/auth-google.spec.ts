import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { Pool, Client } from 'pg';
import Redis from 'ioredis';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import request from 'supertest';
import { OAuth2Client } from 'google-auth-library';
import { createAuthGoogleRoutes } from '../src/routes/auth-google.js';
import { createOAuthClient } from '../src/oauth/google.js';
import { generateKeyPairSync } from 'node:crypto';
import type { VaultClient } from '@otomix/access';

const TEST_TIMEOUT = 300_000;

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let pool: Pool;
let redis: Redis;
let server: http.Server;
let oauthClient: OAuth2Client;

function loadUp(rel: string): string {
  const abs = path.join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = fs.readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i < 0 ? raw : raw.slice(0, i);
}

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: pgContainer.getConnectionUri() });
  
  const admin = new Client({ connectionString: pgContainer.getConnectionUri() });
  await admin.connect();
  await admin.query(loadUp('001_core.sql'));
  await admin.query(loadUp('002_rls.sql'));
  await admin.query(loadUp('008_registration.sql'));
  await admin.end();

  redisContainer = await new RedisContainer('redis:7-alpine').start();
  redis = new Redis({
    host: redisContainer.getHost(),
    port: redisContainer.getMappedPort(6379),
  });

  oauthClient = createOAuthClient('test-client', 'test-secret', 'http://localhost/callback');

  const { privateKey: testPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const testVault: VaultClient = {
    getCurrentKid: async () => 'test-kid',
    getSigningKey: async () => testPrivateKey,
  };
  
  const routes = createAuthGoogleRoutes({
    pool,
    redis,
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUri: 'http://localhost/callback',
    oauthClient,
    vault: testVault,
  });

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const handler = routes[url.pathname as keyof typeof routes];
    if (handler) {
      const handled = await handler(req, res);
      if (handled) return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
}, TEST_TIMEOUT);

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool?.end();
  await redis?.quit();
  await pgContainer?.stop();
  await redisContainer?.stop();
}, TEST_TIMEOUT);

describe('Google OAuth (P07-REG-M02)', () => {
  it('first time creates user, second time returns same user', async () => {
    const mockPayload = { sub: 'g-123', email: 'test@example.com', name: 'Test User' };
    vi.spyOn(oauthClient, 'verifyIdToken').mockResolvedValue({
      getPayload: () => mockPayload,
    } as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: 'fake-token' }),
    }));

    // 1. First call (create)
    const start1 = await request(server).get('/auth/google/start');
    expect(start1.status).toBe(302);
    const state1 = new URL(start1.headers.location).searchParams.get('state')!;
    
    const res1 = await request(server).get(`/auth/google/callback?code=123&state=${state1}`);
    expect(res1.status).toBe(200);
    const body1 = JSON.parse(res1.text);
    expect(body1.user_id).toBeDefined();
    expect(body1.access_token).toBeDefined();

    // 2. Second call (replay)
    const start2 = await request(server).get('/auth/google/start');
    const state2 = new URL(start2.headers.location).searchParams.get('state')!;
    
    const res2 = await request(server).get(`/auth/google/callback?code=123&state=${state2}`);
    expect(res2.status).toBe(200);
    const body2 = JSON.parse(res2.text);
    expect(body2.user_id).toBe(body1.user_id); // Same user_id
  });
});