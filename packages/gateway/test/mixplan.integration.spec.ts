import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Pool } from 'pg';
import Redis from 'ioredis';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGatewayApp } from '../src/index.js';
import { createIdempotencyStore } from '../src/idempotency/store.js';
import { FeaturesRepository } from '../src/repository/features-repository.js';
import { TrackRepository } from '../src/repository/track-repository.js';
import { createMixPlanAdapter } from '../src/routes/mixplan-adapter.js';
import type { NextFunction, Request, Response } from 'express';

const TEST_TIMEOUT = 180_000;
const KEY_A = '123e4567-e89b-42d3-a456-426614174100';
const KEY_B = '123e4567-e89b-42d3-a456-426614174101';

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const down = raw.indexOf('-- Down');
  return down === -1 ? raw : raw.substring(0, down);
}

describe('POST /api/v1/mixplan integration', () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let adminPool: Pool;
  let appPool: Pool;
  let redis: Redis;
  let app: ReturnType<typeof createGatewayApp>;
  let dynamicTenant: string | undefined;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16-alpine').start();
    redisContainer = await new RedisContainer('redis:7-alpine').start();

    adminPool = new Pool({ connectionString: pg.getConnectionUri() });
    await adminPool.query(loadUp('001_core.sql'));
    await adminPool.query(loadUp('002_rls.sql'));
    await adminPool.query(loadUp('007_tracks_source_declarations.sql'));
    await adminPool.query(
      `ALTER TABLE tracks DROP CONSTRAINT tracks_tenant_id_check`,
    );
    await adminPool.query(
      `ALTER TABLE tracks ADD CONSTRAINT tracks_tenant_id_check CHECK (tenant_id IN ('otomix','otodj'))`,
    );

    appPool = new Pool({
      host: pg.getHost(),
      port: pg.getMappedPort(5432),
      database: pg.getDatabase(),
      user: 'app_user',
      password: 'app_user_password',
    });

    await adminPool.query(
      `INSERT INTO users (user_id, tenant_id, role, tier) VALUES
       ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'otomix', 'end_user', 1),
       ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'otodj', 'end_user', 1)`,
    );
    for (const tenant of ['otomix', 'otodj']) {
      const owner = tenant === 'otomix'
        ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const suffix = tenant === 'otomix' ? '1000' : '2000';
      await adminPool.query(
        `INSERT INTO tracks
         (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
         VALUES
         ($1, $2, $3, decode($4, 'hex'), 'wav', 200000, $5),
         ($6, $2, $3, decode($7, 'hex'), 'wav', 180000, $8)`,
        [
          `22222222-2222-4222-8222-${suffix}00000000`,
          tenant,
          owner,
          `${tenant === 'otomix' ? '11' : '22'}${'00'.repeat(31)}`,
          `${tenant}/out.wav`,
          `33333333-3333-4333-8333-${suffix}00000000`,
          `${tenant === 'otomix' ? '33' : '44'}${'00'.repeat(31)}`,
          `${tenant}/in.wav`,
        ],
      );
      await adminPool.query(
        `INSERT INTO features
         (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
          energy_scalar, energy_stars, mixability, groove_mode, registry_json)
         VALUES
         ($1, $2, $3, '1.2.0', 120, '8A', 0.5, 3, 0.5, 'straight', '{}'::jsonb),
         ($4, $2, $5, '1.2.0', 124, '8A', 0.5, 3, 0.5, 'straight', '{}'::jsonb)`,
        [
          `44444444-4444-4444-8444-${suffix}00000000`,
          tenant,
          `22222222-2222-4222-8222-${suffix}00000000`,
          `55555555-5555-4555-8555-${suffix}00000000`,
          `33333333-3333-4333-8333-${suffix}00000000`,
        ],
      );
    }

    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379),
    });
    const featuresRepo = new FeaturesRepository(appPool);
    const trackRepo = new TrackRepository(appPool);
    const planAdapter = createMixPlanAdapter({ featuresRepo, trackRepo });
    const idemStore = createIdempotencyStore(redis);

    const interceptor = async (req: Request, _res: Response, next: NextFunction) => {
      const auth = req.headers.authorization;
      if (!auth) {
        (req as Request & { claims?: unknown }).claims = undefined;
      } else if (auth === 'Bearer otodj') {
        (req as Request & { claims?: unknown }).claims = { tenant_id: 'otodj' };
      } else if (auth === 'Bearer missing-tenant') {
        (req as Request & { claims?: unknown }).claims = {};
      } else {
        (req as Request & { claims?: unknown }).claims = { tenant_id: 'otomix' };
      }
      next();
    };

    app = createGatewayApp({
      pool: appPool,
      interceptor,
      mixplan: {
        idempotencyStore: idemStore,
        planTransition: planAdapter,
      },
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await redis.quit();
    await appPool?.end();
    await adminPool?.end();
    await redisContainer?.stop();
    await pg?.stop();
  }, TEST_TIMEOUT);

  const baseRequest = (
    tenantId: string,
    outgoingId: string,
    incomingId: string,
    key: string
  ) => ({
    tenant_id: tenantId,
    outgoing_track_id: outgoingId,
    incoming_track_id: incomingId,
    bpm_out: 120,
    bpm_in: 124,
    bpm_target: 122,
    window_beats: 16,
    crossfade_ms: 5,
    chop_grid: 1,
    idempotency_key: key,
  });

  it('happy path returns two anchors and missing_t0 fallback', async () => {
    const body = baseRequest(
      'otomix',
      '22222222-2222-4222-8222-100000000000',
      '33333333-3333-4333-8333-100000000000',
      KEY_A,
    );
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', KEY_A)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.anchors).toHaveLength(2);
    expect(res.body.fallback.reason).toBe('missing_t0');
  });

  it('returns 403 for missing tenant claim', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174102';
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer missing-tenant')
      .set('Idempotency-Key', key)
      .send(baseRequest(
        'otomix',
        '22222222-2222-4222-8222-100000000000',
        '33333333-3333-4333-8333-100000000000',
        key,
      ));
    expect(res.status).toBe(403);
  });

  it('returns 403 for wrong tenant claim vs body tenant', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174103';
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer otodj')
      .set('Idempotency-Key', key)
      .send(baseRequest(
        'otomix',
        '22222222-2222-4222-8222-100000000000',
        '33333333-3333-4333-8333-100000000000',
        key,
      ));
    expect(res.status).toBe(403);
  });

  it('returns 404 for nonexistent outgoing track', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174104';
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(baseRequest(
        'otomix',
        '99999999-9999-4999-8999-999999999999',
        '33333333-3333-4333-8333-100000000000',
        key,
      ));
    expect(res.status).toBe(404);
  });

  it('returns 404 for nonexistent incoming track', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174105';
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(baseRequest(
        'otomix',
        '22222222-2222-4222-8222-100000000000',
        '99999999-9999-4999-8999-999999999999',
        key,
      ));
    expect(res.status).toBe(404);
  });

  it('replays the same response for the same idempotency key', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174106';
    const body = baseRequest(
      'otomix',
      '22222222-2222-4222-8222-100000000000',
      '33333333-3333-4333-8333-100000000000',
      key,
    );
    const first = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(body);
    const replay = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(body);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
  });

  it('returns 409 for same key and different body', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174107';
    const original = baseRequest(
      'otomix',
      '22222222-2222-4222-8222-100000000000',
      '33333333-3333-4333-8333-100000000000',
      key,
    );
    const first = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(original);
    expect(first.status).toBe(200);
    const conflict = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send({ ...original, bpm_in: 125 });
    expect(conflict.status).toBe(409);
  });

  it('isolates same idempotency key across tenants', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174108';
    const otomix = baseRequest(
      'otomix',
      '22222222-2222-4222-8222-100000000000',
      '33333333-3333-4333-8333-100000000000',
      key,
    );
    const otodj = baseRequest(
      'otodj',
      '22222222-2222-4222-8222-200000000000',
      '33333333-3333-4333-8333-200000000000',
      key,
    );
    const a = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(otomix);
    const b = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer otodj')
      .set('Idempotency-Key', key)
      .send(otodj);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it('returns 400 for missing Idempotency-Key header', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174109';
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .send(baseRequest(
        'otomix',
        '22222222-2222-4222-8222-100000000000',
        '33333333-3333-4333-8333-100000000000',
        key,
      ));
    expect(res.status).toBe(400);
  });

  it('returns 400 when header and body idempotency keys differ', async () => {
    const key = '123e4567-e89b-42d3-a456-426614174110';
    const res = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(baseRequest(
        'otomix',
        '22222222-2222-4222-8222-100000000000',
        '33333333-3333-4333-8333-100000000000',
        '123e4567-e89b-42d3-a456-426614174111',
      ));
    expect(res.status).toBe(400);
  });
});
