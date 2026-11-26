import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import request from 'supertest';
import { createGatewayApp } from '../src/index.js';
import { createInterceptor } from '../src/interceptor.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_TIMEOUT = 120_000;

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i !== -1 ? raw.substring(0, i) : raw;
}

describe('GET /api/v1/catalog/features (P08-T01-S01-M01)', () => {
  let ctr: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: ReturnType<typeof createGatewayApp>;

  beforeAll(async () => {
    ctr = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: ctr.getConnectionUri() });
    for (const f of ['001_core.sql', '002_rls.sql']) {
      await pool.query(loadUp(f));
    }

    // Seed data using a single client
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL app.tenant_id = 'otomix'");
      for (let i = 1; i <= 250; i++) {
        const id = `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`;
        await client.query(
          `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json, analyzed_at)
           VALUES ($1, 'otomix', $2, '1.0', 120, '8A', 0.5, 3, 0.5, 'straight', '{}', now())`,
          [id, id]
        );
      }
      await client.query('COMMIT');

      await client.query('BEGIN');
      await client.query("SET LOCAL app.tenant_id = 'otodj'");
      for (let i = 1; i <= 5; i++) {
        const id = `11111111-0000-0000-0000-${i.toString().padStart(12, '0')}`;
        await client.query(
          `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json)
           VALUES ($1, 'otodj', $2, '1.0', 120, '8A', 0.5, 3, 0.5, 'straight', '{}')`,
          [id, id]
        );
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const interceptor = createInterceptor({
      verifyToken: {
        verify: async (token: string) => {
          if (token === 'valid-no-scope') {
            return { sub: 'u1', tenant_id: 'otomix', jti: 'j1', iat: 0, exp: 0 };
          }
          if (token === 'valid-wrong-tenant') {
            return { sub: 'u2', tenant_id: 'otodj', jti: 'j2', iat: 0, exp: 0 };
          }
          return { sub: 'u1', tenant_id: 'otomix', jti: 'j1', iat: 0, exp: 0 };
        },
      },
      isDenied: async () => false,
      getEffectivePermissions: async (_userId: string, _tenantId: string) => {
        return new Set<string>(['user:read']);
      },
      expectedTenantId: 'otomix',
    });

    app = createGatewayApp({ pool, interceptor });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await pool.end();
    await ctr.stop();
  });

  it('paginates 100 -> 100 -> 50 and filters tenant', async () => {
    // Page 1
    const r1 = await request(app).get('/api/v1/catalog/features?limit=100').set('Authorization', 'Bearer valid');
    expect(r1.status).toBe(200);
    expect(r1.body.items.length).toBe(100);
    expect(r1.body.next_cursor).not.toBeNull();

    // Page 2
    const r2 = await request(app).get(`/api/v1/catalog/features?limit=100&cursor=${encodeURIComponent(r1.body.next_cursor)}`).set('Authorization', 'Bearer valid');
    expect(r2.status).toBe(200);
    expect(r2.body.items.length).toBe(100);
    expect(r2.body.next_cursor).not.toBeNull();

    // Page 3
    const r3 = await request(app).get(`/api/v1/catalog/features?limit=100&cursor=${encodeURIComponent(r2.body.next_cursor)}`).set('Authorization', 'Bearer valid');
    expect(r3.status).toBe(200);
    expect(r3.body.items.length).toBe(50);
    expect(r3.body.next_cursor).toBeNull();

    // Check no otodj rows
    const allItems = [...r1.body.items, ...r2.body.items, ...r3.body.items];
    const hasOtodj = allItems.some((item: any) => item.tenant_id === 'otodj');
    expect(hasOtodj).toBe(false);
    const featureIds = allItems.map((item: any) => item.feature_id);
    expect(new Set(featureIds).size).toBe(250);
    expect(featureIds).toEqual([...featureIds].sort());
  });

  it('returns 403 when user:read scope is missing', async () => {
    const noScopeInterceptor = createInterceptor({
      verifyToken: {
        verify: async () => ({ sub: 'u1', tenant_id: 'otomix', jti: 'j1', iat: 0, exp: 0 }),
      },
      isDenied: async () => false,
      getEffectivePermissions: async () => new Set<string>(),
      expectedTenantId: 'otomix',
    });
    const noScopeApp = createGatewayApp({ pool, interceptor: noScopeInterceptor });

    const res = await request(noScopeApp)
      .get('/api/v1/catalog/features')
      .set('Authorization', 'Bearer valid');
    expect(res.status).toBe(403);
  });

  it('returns 401 when bearer authentication is missing', async () => {
    const res = await request(app).get('/api/v1/catalog/features');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid cursor', async () => {
    const res = await request(app).get('/api/v1/catalog/features?cursor=invalid-base64').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(400);
  });
});