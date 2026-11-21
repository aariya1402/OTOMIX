// OTOMIX 5.1; 9.10; 9.11 - Mother 1; Add. 1-2 - GAP-023; GAP-030
// GATE0-P05-M07: Wire runEnrichment() into the ingest flow

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import * as http from 'node:http';
import { createIngestLocalRoute } from '../src/routes/ingest-local';
import { processEnrichmentQueue } from '../src/enrichment-consumer';
import { runDecodeWorker } from '../src/ingest/decode-worker';
import { verifyRequest } from '../src/interceptor';
import type { InterceptorDeps } from '../src/interceptor';
import { validateIdempotencyKey } from '../src/idempotency/validate';
import type { IdempotencyStore, IdempotencyResult, StoredRecord } from '../src/idempotency/store';
import { createLogger, EngineRunner, EngineAnalysisRequest, EngineAnalysisResponse } from '@otomix/core';
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

describe('GATE0-P05-M07: Enrichment flow (ingest + async worker + cache)', () => {
  let container: StartedPostgreSqlContainer;
  let adminPool: Pool;
  let appPool: Pool;
  let server: http.Server;
  let baseUrl: string;
  let logger: Logger;
  let handler: (req: http.IncomingMessage, res: http.ServerResponse, claims: any) => Promise<void>;
  let currentPerms: Set<string>;
  let mockEngine: EngineRunner;
  let workerInvocationCount: number;
  let res: { status: number; body: any; track_id?: string };

  beforeAll(async () => {
    logger = createLogger({ service: 'test' });

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    adminPool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });

    appPool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });

    // Manually create required tables
    const client = await adminPool.connect();
    try {
      await client.query(`
        CREATE TABLE users (
          user_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id      text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
          role           text NOT NULL CHECK (role IN ('audio_dsp_admin','content_licensing_admin','system_admin','end_user')),
          tier           smallint NOT NULL CHECK (tier IN (1,2)),
          google_id      text,
          telegram_id    text,
          phone_e164     text,
          email          text,
          display_name   text,
          terms_version  text,
          terms_accepted_at timestamptz,
          created_at     timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX users_google_id_key ON users (google_id);
        CREATE UNIQUE INDEX users_telegram_id_key ON users (telegram_id);
        CREATE UNIQUE INDEX users_phone_e164_key ON users (phone_e164);
        CREATE UNIQUE INDEX users_email_key ON users (email);

        INSERT INTO users (user_id, tenant_id, role, tier)
        VALUES ('11111111-1111-1111-1111-111111111111', 'otomix', 'end_user', 1);

        CREATE TABLE features (
          feature_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
          track_id        uuid NOT NULL,
          schema_version  text NOT NULL,
          bpm             numeric(6,3) NOT NULL CHECK (bpm >= 60.0 AND bpm <= 200.0),
          camelot_key     text NOT NULL CHECK (camelot_key ~ '^(1[0-2]|[1-9])[AB]$'),
          energy_scalar   numeric(5,4) NOT NULL CHECK (energy_scalar BETWEEN 0 AND 1),
          energy_stars    smallint     NOT NULL CHECK (energy_stars BETWEEN 0 AND 5),
          mixability      numeric(5,4) NOT NULL CHECK (mixability BETWEEN 0 AND 1),
          groove_mode     text NOT NULL CHECK (groove_mode IN ('straight','triplet','swing')),
          registry_json   jsonb NOT NULL,
          analysis_status text NOT NULL DEFAULT 'placeholder' CHECK (analysis_status IN ('placeholder','pending','complete')),
          analyzed_at     timestamptz NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, track_id, schema_version)
        );

        CREATE TABLE global_track_metadata (
          content_sha256 text PRIMARY KEY,
          raw_analysis_data jsonb NOT NULL DEFAULT '{}',
          analysis_version text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE tracks (
          track_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       text NOT NULL CHECK (tenant_id = 'otomix'),
          owner_id        uuid NOT NULL REFERENCES users(user_id),
          content_sha256  bytea NOT NULL,
          format          text NOT NULL CHECK (format IN ('mp3','wav','flac')),
          duration_ms     integer NOT NULL CHECK (duration_ms > 0),
          storage_key     text NOT NULL,
          created_at      timestamptz NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, owner_id, content_sha256)
        );

        CREATE TABLE source_declarations (
          declaration_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       text NOT NULL CHECK (tenant_id = 'otomix'),
          user_id         uuid NOT NULL REFERENCES users(user_id),
          scope           text NOT NULL CHECK (scope IN ('ingest','publish','export')),
          terms_version   text NOT NULL,
          declared_at     timestamptz NOT NULL
        );

        CREATE TABLE outbox (
          message_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id    text NOT NULL,
          topic        text NOT NULL,
          payload      jsonb NOT NULL,
          created_at   timestamptz NOT NULL DEFAULT now(),
          delivered_at timestamptz,
          delivery_status text
        );
      `);
    } finally {
      client.release();
    }

    // Create mock engine that returns fake features
    workerInvocationCount = 0;
    mockEngine = {
      async runAnalysis(request: EngineAnalysisRequest): Promise<EngineAnalysisResponse> {
        workerInvocationCount++;
        return {
          status: 'success',
          features: {
            bpm: 128.0,
            camelot_key: '8A',
            energy: 0.75,
            groove_mode: 'straight',
            mixability: 0.85,
            vocal_presence: 0.1,
            drift_absence: 0.95,
            kick_grid_lock: 0.9,
            grid_type_clarity: 0.88,
            transition_window_present: 1.0,
            loudness_range: 4.2,
          },
        };
      },
    };

    // Set up ingest route
    const idempotencyStore = makeInMemoryIdempotencyStore();

    const interceptorDeps: InterceptorDeps = {
      verifyToken: {
        verify: async (token: string) => {
          if (token === 'valid-token') {
            return {
              sub: '11111111-1111-1111-1111-111111111111',
              tenant_id: 'otomix',
              jti: 'jti-test',
              iat: 0,
              exp: 9999999999,
            };
          }
          throw new Error('INVALID_TOKEN');
        },
      },
      isDenied: async () => false,
      getEffectivePermissions: async () => currentPerms,
      expectedTenantId: 'otomix',
    };

    handler = createIngestLocalRoute({
      pool: appPool,
      idempotencyStore,
      logger,
      limitsConfig: { maxBytes: 1024 * 1024, maxDurationSec: 600 },
    });

    server = http.createServer(async (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.statusCode = 401;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'UNAUTHENTICATED', message: 'Missing or invalid token' }));
        return;
      }

      const result = await verifyRequest(req, interceptorDeps);
      if (!result.ok) {
        const status = result.code === 'UNAUTHENTICATED' ? 401 : 403;
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: result.code, message: result.message }));
        return;
      }

      if (req.method === 'POST' && req.url === '/api/v1/ingest/local') {
        await handler(req, res, result.claims);
      } else {
        res.statusCode = 404;
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });
    const address = server.address() as { port: number };
    baseUrl = `http://localhost:${address.port}`;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await server.close();
    await appPool.end();
    await adminPool.end();
    await container.stop();
  }, TEST_TIMEOUT);

  function post(body: Buffer, headers: Record<string, string>): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `${baseUrl}/api/v1/ingest/local`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/octet-stream',
            ...headers,
            'content-length': body.length.toString(),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
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

  it('first upload returns 202 with enrichment_status: pending', async () => {
    currentPerms = new Set(['local:process']);
    const key = uuid();
    res = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'idempotency-key': key,
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });
    expect(res.status).toBe(202);
    expect(typeof res.body.track_id).toBe('string');
    expect(res.body.enrichment_status).toBe('pending');
    expect(res.body.sha256).toBe('abababababababababababababababababababababababababababababababab');
    expect(res.body.format).toBe('mp3');
  }, TEST_TIMEOUT);

  it('enrichment consumer processes the outbox and marks feature complete', async () => {
    // Process the enrichment queue
    const result = await processEnrichmentQueue({
      pool: appPool,
      workerRegistry: { get: () => ({ path: 'mock' }) },
      engine: mockEngine,
      logger,
    });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(workerInvocationCount).toBe(1);

    // Verify feature row is now 'complete'
    const featureCheck = await appPool.query(
      `SELECT analysis_status FROM features WHERE track_id = $1 AND tenant_id = 'otomix'`,
      [res.body.track_id]
    );
    expect(featureCheck.rows[0].analysis_status).toBe('complete');
  }, TEST_TIMEOUT);

  it('second upload with same content returns 200 with enrichment_status: complete and cache hit', async () => {
    // Reset mock to track if it's called again
    workerInvocationCount = 0;

    currentPerms = new Set(['local:process']);
    const key = uuid();
    const res2 = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'idempotency-key': key,
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });

    expect(res2.status).toBe(200);
    expect(res2.body.enrichment_status).toBe('complete');
    expect(res2.body.track_id).toBe(res.body.track_id); // same track
    expect(res2.body.sha256).toBe('abababababababababababababababababababababababababababababababab');
    // Worker should NOT be invoked again (cache hit)
    expect(workerInvocationCount).toBe(0);
  }, TEST_TIMEOUT);

  it('replay with same Idempotency-Key returns 200 with stored body', async () => {
    currentPerms = new Set(['local:process']);
    const key = uuid();
    const first = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'idempotency-key': key,
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });
    expect(first.status).toBe(200); // already exists, replay

    const second = await post(mp3Fixture(), {
      authorization: 'Bearer valid-token',
      'idempotency-key': key,
      'x-filename': 'test.mp3',
      'content-type': 'application/octet-stream',
    });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  }, TEST_TIMEOUT);
});