import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Pool } from 'pg';
import { createGatewayApp } from '../src/index.js';
import { createInterceptor } from '../src/interceptor.js';
import type { IdempotencyResult, IdempotencyStore, StoredRecord } from '../src/idempotency/store.js';
import {
  MixPlanTrackNotFoundError,
  type MixPlanRequest,
  type MixPlanResponse,
} from '../src/routes/mixplan.js';

function makeStore(): IdempotencyStore {
  const records = new Map<string, StoredRecord>();
  return {
    async withIdempotency<T>(
      tenantIdOrKey: string,
      keyOrFingerprint: string,
      fingerprintOrHandler: string | (() => Promise<T>),
      maybeHandler?: () => Promise<T>
    ): Promise<IdempotencyResult<T>> {
      const tenantScoped = typeof fingerprintOrHandler === 'string';
      const tenantId = tenantScoped ? tenantIdOrKey : '';
      const key = tenantScoped ? keyOrFingerprint : tenantIdOrKey;
      const fingerprint = tenantScoped
        ? (fingerprintOrHandler as string)
        : keyOrFingerprint;
      const handler = tenantScoped
        ? (maybeHandler as () => Promise<T>)
        : (fingerprintOrHandler as () => Promise<T>);
      const recordKey = `${tenantId}:${key}`;
      const current = records.get(recordKey);
      if (current) {
        if (current.fingerprint !== fingerprint || current.status !== 'completed') {
          return { status: 'conflict' };
        }
        return { status: 'replay', response: current.response as T };
      }
      records.set(recordKey, { fingerprint, status: 'in_progress' });
      try {
        const response = await handler();
        records.set(recordKey, { fingerprint, status: 'completed', response });
        return { status: 'fresh', response };
      } catch (error) {
        records.delete(recordKey);
        throw error;
      }
    },
    async getResponse(key) {
      return records.get(key) ?? null;
    },
    async getTTL() {
      return 86400;
    },
    async close() {},
  };
}

const key = '123e4567-e89b-42d3-a456-426614174000';
const validRequest: MixPlanRequest = {
  tenant_id: 'otomix',
  outgoing_track_id: 'outgoing',
  incoming_track_id: 'incoming',
  bpm_out: 120,
  bpm_in: 124,
  bpm_target: 122,
  window_beats: 16,
  crossfade_ms: 5,
  chop_grid: 1,
  idempotency_key: key,
};

function makeApp(
  planTransition: (body: MixPlanRequest) => Promise<MixPlanResponse>,
  permissions = new Set(['local:process'])
) {
  const interceptor = createInterceptor({
    verifyToken: {
      verify: async () => ({
        sub: 'user',
        tenant_id: 'otomix',
        jti: 'test',
        iat: 0,
        exp: 9999999999,
      }),
    },
    isDenied: async () => false,
    getEffectivePermissions: async () => permissions,
    expectedTenantId: 'otomix',
  });
  return createGatewayApp({
    pool: {} as Pool,
    interceptor,
    mixplan: { idempotencyStore: makeStore(), planTransition },
  });
}

describe('POST /api/v1/mixplan (P08-T04-S02-M02)', () => {
  it('requires local:process', async () => {
    const app = makeApp(vi.fn(), new Set());
    const response = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(validRequest);
    expect(response.status).toBe(403);
  });

  it('invokes PlanTransition once and replays the exact response for a duplicate key', async () => {
    const planTransition = vi.fn(async () => ({
      anchors: [{ beat_index: 17, t0_seconds: 31.5, drift_seconds: 0 }],
    }));
    const app = makeApp(planTransition);
    const post = () =>
      request(app)
        .post('/api/v1/mixplan')
        .set('Authorization', 'Bearer valid')
        .set('Idempotency-Key', key)
        .send(validRequest);

    const first = await post();
    const replay = await post();
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(planTransition).toHaveBeenCalledTimes(1);
    expect(planTransition).toHaveBeenCalledWith(validRequest);
  });

  it('rejects invalid BPM and a mismatched idempotency key', async () => {
    const app = makeApp(vi.fn());
    const common = request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key);
    const invalidBpm = await common.send({ ...validRequest, bpm_out: 300 });
    expect(invalidBpm.status).toBe(400);

    const mismatch = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send({ ...validRequest, idempotency_key: '123e4567-e89b-42d3-a456-426614174001' });
    expect(mismatch.status).toBe(400);

    const excessiveCrossfade = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send({ ...validRequest, crossfade_ms: 50 });
    expect(excessiveCrossfade.status).toBe(400);
  });

  it('fails closed when the PlanTransition backend is not configured', async () => {
    const interceptor = createInterceptor({
      verifyToken: {
        verify: async () => ({
          sub: 'user',
          tenant_id: 'otomix',
          jti: 'test',
          iat: 0,
          exp: 9999999999,
        }),
      },
      isDenied: async () => false,
      getEffectivePermissions: async () => new Set(['local:process']),
      expectedTenantId: 'otomix',
    });
    const app = createGatewayApp({
      pool: {} as Pool,
      interceptor,
      mixplan: { idempotencyStore: makeStore() },
    });
    const response = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(validRequest);
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('UNAVAILABLE');
  });

  it('returns tenant mismatch as 403', async () => {
    const app = makeApp(vi.fn());
    const response = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send({ ...validRequest, tenant_id: 'otodj' });
    expect(response.status).toBe(403);
  });

  it('returns track lookup failures as 404', async () => {
    const app = makeApp(async () => {
      throw new MixPlanTrackNotFoundError();
    });
    const response = await request(app)
      .post('/api/v1/mixplan')
      .set('Authorization', 'Bearer valid')
      .set('Idempotency-Key', key)
      .send(validRequest);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
  });
});
