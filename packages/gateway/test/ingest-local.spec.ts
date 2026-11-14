// OTOMIX 5.1; 9.10 - Mother 1; Add. 1-2 - GAP-014; GAP-017

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import * as http from 'node:http';
import { createIngestLocalRoute } from '../src/routes/ingest-local';
import { verifyRequest } from '../src/interceptor';
import type { InterceptorDeps } from '../src/interceptor';
import { validateIdempotencyKey } from '../src/idempotency/validate';
import type { IdempotencyStore, IdempotencyResult, StoredRecord } from '../src/idempotency/store';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';

vi.mock('../src/ingest/decode-worker', () => ({
  runDecodeWorker: vi.fn(async () => ({
    ok: true,
    value: {
      pcm: new Float32Array(44100),
      sampleRate: 44100,
      sha256: 'abababababababababababababababababababababababababababababababab',
    },
  })),
}));

const TEST_TIMEOUT = 180000;

function makeInMemoryIdempotencyStore(): IdempotencyStore {
  const store = new Map<string, StoredRecord>();
  return {
    async withIdempotency<T>(
      key: string,
      fingerprint: string,
      handler: () => Promise<T>,
    ): Promise<IdempotencyResult<T>> {
      const existing = store.get(key);
      if (existing) {
        if (existing.fingerprint !== fingerprint) return { status: 'conflict' };
        if (existing.status === 'completed') {
          return { status: 'replay', response: existing.response as T };
        }
        return { status: 'conflict' };
      }
      store.set(key, { fingerprint, status: 'in_progress' });
      try {
        const response = await handler();
        store.set(key, { fingerprint, status: 'completed', response });
        return { status: 'fresh', response };
      } catch (err) {
        store.delete(key);
        throw err;
      }
    },
    async getResponse(key: string) {
      return store.get(key) ?? null;
    },
    async getTTL() {
      return 86400;
    },
    async close() {},
  };
}

describe('POST /api/v1/ingest/local (P07-T03-S02-M02)', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;
  let server: http.Server;
  let baseUrl: string;
  let logger: Logger;
  let handler: (req: http.IncomingMessage, res: http.ServerResponse, claims: any) => Promise<void>;
  let currentPerms: Set<string>;

  beforeAll(async () => {
    logger = createLogger({ service: 'test' });

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    client = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await client.connect();

    await client.query(
      'CREATE TABLE tracks (' +
      '  track_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),' +
      '  tenant_id       text NOT NULL,' +
      '  owner_id        text NOT NULL,' +
      '  content_sha256  bytea NOT NULL,' +
      '  format          text NOT NULL,' +
      '  duration_ms     integer NOT NULL CHECK (duration_ms > 0),' +
      '  storage_key     text NOT NULL,' +
      '  created_at      timestamptz NOT NULL DEFAULT now(),' +
      '  UNIQUE (tenant_id, owner_id, content_sha256)' +
      ');'
    );

    const idemStore = makeInMemoryIdempotencyStore();

    handler = createIngestLocalRoute({
      logger,
      pool: {
        connect: async () =>
          ({
            query: client.query.bind(client),
            release: () => {},
          }) as any,
      },
      idempotencyStore: idemStore,
    });

    const interceptorDeps: InterceptorDeps = {
      verifyToken: {
        verify: async () => ({
          sub: 'test-user-id',
          tenant_id: 'otomix',
          jti: 'jti-test',
          iat: 0,
          exp: 9999999999,
        }),
      },
      isDenied: async () => false,
      getEffectivePermissions: async () => currentPerms,
      expectedTenantId: 'otomix',
    };

    server = http.createServer(async (req, res) => {
      if (!(req.url === '/api/v1/ingest/local' && req.method === 'POST')) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const verifyResult = await verifyRequest(req, interceptorDeps);
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.code === 'UNAUTHENTICATED' ? 401 : 403;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: verifyResult.code, message: verifyResult.message }));
        return;
      }
      let passed = false;
      validateIdempotencyKey(req, res, () => {
        passed = true;
      });
      if (!passed) return;
      await handler(req, res, verifyResult.claims);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as { port: number };
    baseUrl = 'http://localhost:' + addr.port;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (client) await client.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  function post(body: Buffer, headers: Record<string, string>): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        baseUrl + '/api/v1/ingest/local',
        { method: 'POST', headers },
        (res) => {
          let data = '';
          res.on('data', (c) => {
            data += c;
          });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode ?? 0, body: data });
            }
          });
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  function mp3Fixture(): Buffer {
    return Buffer.from([
      0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xff, 0xfb, 0x90, 0x00,
    ]);
  }

  function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  it('rejects without local:process permission -> 403', async () => {
    currentPerms = new Set(['user:read']);
    const res = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'idempotency-key': uuid(),
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  }, TEST_TIMEOUT);

  it('rejects with permission but missing Idempotency-Key -> 400', async () => {
    currentPerms = new Set(['local:process']);
    const res = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARGUMENT');
  }, TEST_TIMEOUT);

  it('valid request -> 201 with track_id', async () => {
    currentPerms = new Set(['local:process']);
    const res = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'idempotency-key': uuid(),
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });
    expect(res.status).toBe(201);
    expect(typeof res.body.track_id).toBe('string');
    expect(res.body.track_id.length).toBeGreaterThan(0);
    expect(res.body.sha256).toBe(
      'abababababababababababababababababababababababababababababababab',
    );
    expect(res.body.format).toBe('mp3');
  }, TEST_TIMEOUT);

  it('replay with same Idempotency-Key -> 200 with stored body', async () => {
    currentPerms = new Set(['local:process']);
    const key = uuid();
    const headers = {
      authorization: 'Bearer valid-token',
      'idempotency-key': key,
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    };
    const first = await post(mp3Fixture(), headers);
    expect(first.status).toBe(201);
    const second = await post(mp3Fixture(), headers);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  }, TEST_TIMEOUT);
});