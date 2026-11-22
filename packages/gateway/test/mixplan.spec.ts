// OTOMIX §9.2; §9.4 · Mother Add. §1–§2
// POST /api/v1/mixplan test

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import express from 'express';
import request from 'supertest';
import { createMixPlanHandler } from '../src/routes/mixplan';
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

const TEST_TIMEOUT = 600000;

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

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CREATE_USERS_TABLE = `
CREATE TABLE users (
  user_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
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
`;

const CREATE_FEATURES_TABLE = `
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
`;

const CREATE_GLOBAL_TRACK_METADATA = `
CREATE TABLE global_track_metadata (
  content_sha256 text PRIMARY KEY,
  raw_analysis_data jsonb NOT NULL DEFAULT '{}',
  analysis_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREATE_TRACKS_TABLE = `
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
`;

const CREATE_SOURCE_DECLARATIONS = `
CREATE TABLE source_declarations (
  declaration_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text NOT NULL CHECK (tenant_id = 'otomix'),
  user_id         uuid NOT NULL REFERENCES users(user_id),
  scope           text NOT NULL CHECK (scope IN ('ingest','publish','export')),
  terms_version   text NOT NULL,
  declared_at     timestamptz NOT NULL
);
`;

const CREATE_OUTBOX_TABLE = `
CREATE TABLE outbox (
  message_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text NOT NULL,
  topic        text NOT NULL,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  delivery_status text
);
`;

const CREATE_INDEXES = `
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key ON users (google_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_key ON users (telegram_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_key ON users (phone_e164);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
`;

const ALL_TABLES_SQL = CREATE_USERS_TABLE + CREATE_INDEXES + CREATE_FEATURES_TABLE + CREATE_GLOBAL_TRACK_METADATA + CREATE_TRACKS_TABLE + CREATE_SOURCE_DECLARATIONS + CREATE_OUTBOX_TABLE;

const INSERT_COMPLETE_FEATURES = `
INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json, analysis_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
`;

const INSERT_PLACEHOLDER_FEATURE = `
INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json, analysis_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
`;

const FEATURE_DATA_COMPLETE_128 = (trackId: string) => [
  crypto.randomUUID(),
  'otomix',
  trackId,
  '1.2',
  128,
  '8A',
  0.75,
  4,
  0.85,
  'straight',
  JSON.stringify({ t0: 0, hasKick: true, attackBeats: [], bodyBeats: [], duration: 180000, vocalMap: [], preKickOffsets: [] }),
  'complete',
];

const FEATURE_DATA_COMPLETE_120 = (trackId: string) => [
  crypto.randomUUID(),
  'otomix',
  trackId,
  '1.2',
  120,
  '8A',
  0.75,
  3,
  0.85,
  'straight',
  JSON.stringify({ t0: 0, hasKick: true, attackBeats: [], bodyBeats: [], duration: 180000, vocalMap: [], preKickOffsets: [] }),
  'complete',
];

const FEATURE_DATA_PLACEHOLDER = (trackId: string) => [
  crypto.randomUUID(),
  'otomix',
  trackId,
  '1.2',
  120,
  '8A',
  0.5,
  3,
  0.5,
  'straight',
  JSON.stringify({ t0: 0, hasKick: true, attackBeats: [], bodyBeats: [], duration: 180000, vocalMap: [], preKickOffsets: [] }),
  'placeholder',
];

describe('POST /api/v1/mixplan (P08-T04-S02-M02)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: express.Express;
  let logger: Logger;
  let handler: ReturnType<typeof createMixPlanHandler>;
  let currentPerms: Set<string>;

  beforeAll(async () => {
    logger = createLogger({ service: 'test' });

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query(ALL_TABLES_SQL);

    const idempotencyStore = makeInMemoryIdempotencyStore();

    const interceptorDeps: InterceptorDeps = {
      verifyToken: {
        async verify(token: string) {
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

    handler = createMixPlanHandler({
      pool,
      idempotencyStore,
      logger,
    });

    app = express();
    app.use(express.json());
    app.post('/api/v1/mixplan', async (req, res, next) => {
      let claims;
      try {
        claims = await verifyRequest(req, interceptorDeps);
      } catch {
        res.statusCode = 401;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'UNAUTHENTICATED', message: 'Invalid token' }));
        return;
      }

      if (!claims.ok) {
        const status = claims.code === 'UNAUTHENTICATED' ? 401 : 403;
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: claims.code, message: claims.message }));
        return;
      }

      Object.assign(req, { claims: claims.claims });
      await handler(req, res, next);
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  function post(body: Record<string, unknown>, headers: Record<string, string>): Promise<{ status: number; body: Record<string, unknown> }> {
    return request(app)
      .post('/api/v1/mixplan')
      .set(headers)
      .send(body)
      .then(({ status, body: responseBody }) => ({ status, body: responseBody }));
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
    const res = await post(
      { fromTrackId: uuid(), toTrackId: uuid() },
      { authorization: 'Bearer valid-token', 'idempotency-key': uuid() }
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  }, TEST_TIMEOUT);

  it('rejects with permission but missing Idempotency-Key -> 400', async () => {
    currentPerms = new Set(['local:process']);
    const res = await post(
      { fromTrackId: uuid(), toTrackId: uuid() },
      { authorization: 'Bearer valid-token' }
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARGUMENT');
  }, TEST_TIMEOUT);

  it('rejects when fromTrackId or toTrackId missing -> 400', async () => {
    currentPerms = new Set(['local:process']);
    const res = await post(
      { fromTrackId: uuid() },
      { authorization: 'Bearer valid-token', 'idempotency-key': uuid() }
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARGUMENT');
  }, TEST_TIMEOUT);

  it('rejects when tracks not found -> 404', async () => {
    currentPerms = new Set(['local:process']);
    const res = await post(
      { fromTrackId: uuid(), toTrackId: uuid() },
      { authorization: 'Bearer valid-token', 'idempotency-key': uuid() }
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  }, TEST_TIMEOUT);

  it('rejects when track analysis not complete -> 400', async () => {
    currentPerms = new Set(['local:process']);

    // Insert a track with placeholder analysis
    const fromTrackId = uuid();
    const toTrackId = uuid();
    await pool.query(INSERT_PLACEHOLDER_FEATURE, FEATURE_DATA_PLACEHOLDER(fromTrackId));
    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_128(toTrackId));

    const res = await post(
      { fromTrackId, toTrackId },
      { authorization: 'Bearer valid-token', 'idempotency-key': uuid() }
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARGUMENT');
  }, TEST_TIMEOUT);

  it('valid request returns 200 with plan', async () => {
    currentPerms = new Set(['local:process']);

    const fromTrackId = uuid();
    const toTrackId = uuid();

    // Insert complete features for both tracks
    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_128(fromTrackId));
    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_120(toTrackId));

    const key = uuid();
    const res = await post(
      { fromTrackId, toTrackId },
      { authorization: 'Bearer valid-token', 'idempotency-key': key }
    );
    expect(res.status).toBe(200);
    expect(typeof res.body.rung).toBe('string');
    expect(typeof res.body.reason).toBe('string');
    expect(typeof res.body.tInSeconds).toBe('number');
    expect(typeof res.body.tOutSeconds).toBe('number');
    expect(typeof res.body.inBeatIndex).toBe('number');
    expect(typeof res.body.outBeatIndex).toBe('number');
    expect(typeof res.body.alignToSeconds).toBe('number');
    expect(typeof res.body.mappedBpm).toBe('number');
    expect(typeof res.body.windowBeats).toBe('number');
  }, TEST_TIMEOUT);

  it('replay with same Idempotency-Key returns 200 with stored body', async () => {
    currentPerms = new Set(['local:process']);

    const fromTrackId = uuid();
    const toTrackId = uuid();

    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_128(fromTrackId));
    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_120(toTrackId));

    const key = uuid();
    const first = await post(
      { fromTrackId, toTrackId },
      { authorization: 'Bearer valid-token', 'idempotency-key': key }
    );
    expect(first.status).toBe(200);

    const second = await post(
      { fromTrackId, toTrackId },
      { authorization: 'Bearer valid-token', 'idempotency-key': key }
    );
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  }, TEST_TIMEOUT);

  it('rejects invalid fallbackRung -> 400', async () => {
    currentPerms = new Set(['local:process']);

    const fromTrackId = uuid();
    const toTrackId = uuid();

    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_128(fromTrackId));
    await pool.query(INSERT_COMPLETE_FEATURES, FEATURE_DATA_COMPLETE_120(toTrackId));

    const res = await post(
      { fromTrackId, toTrackId, fallbackRung: -1 },
      { authorization: 'Bearer valid-token', 'idempotency-key': uuid() }
    );
    expect(res.status).toBe(400);
  }, TEST_TIMEOUT);
});