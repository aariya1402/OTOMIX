import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import request from 'supertest';
import express from 'express';
import { createCatalogFeaturesHandler } from '../src/routes/catalog-features.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_TIMEOUT = 300_000;

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i !== -1 ? raw.substring(0, i) : raw;
}

describe('GET /api/v1/catalog/features (P08-T01-S01-M01)', () => {
  let ctr: StartedPostgreSqlContainer;
  let adminPool: Pool;
  let appPool: Pool;
  let app: express.Express;

  beforeAll(async () => {
    ctr = await new PostgreSqlContainer('postgres:16-alpine').start();
    const baseUri = ctr.getConnectionUri();
    // Admin pool (superuser) for migrations and seeding
    adminPool = new Pool({ connectionString: baseUri });
    // App pool (app_user role) for handler - RLS is enforced for this role
    const appUri = baseUri.replace(/postgres:\/\/([^:]+):([^@]+)@/, 'postgres://app_user:app_user_password@');
    appPool = new Pool({ connectionString: appUri });

    for (const f of ['001_core.sql', '002_rls.sql', '009_features_analysis_status.sql']) {
      await adminPool.query(loadUp(f));
    }

    // Seed data using admin pool (bypasses RLS for setup)
    const client = await adminPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL app.tenant_id = 'otomix'");
      for (let i = 1; i <= 250; i++) {
        const id = `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`;
        await client.query(
          `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json, analysis_status, analyzed_at)
           VALUES ($1, 'otomix', $2, '1.0', 120, '8A', 0.5, 3, 0.5, 'straight', '{"fixture":true}', 'complete', now() + ($3 || ' seconds')::interval)`,
          [id, id, i]
        );
      }
      await client.query('COMMIT');

      await client.query('BEGIN');
      await client.query("SET LOCAL app.tenant_id = 'otodj'");
      for (let i = 1; i <= 5; i++) {
        const id = `11111111-0000-0000-0000-${i.toString().padStart(12, '0')}`;
        await client.query(
          `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json, analysis_status)
           VALUES ($1, 'otodj', $2, '1.0', 120, '8A', 0.5, 3, 0.5, 'straight', '{"fixture":true}', 'complete')`,
          [id, id]
        );
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    app = express();
    app.use(express.json());
    // Mock interceptor to inject claims
    app.use((req, res, next) => {
      const scope = req.headers['x-test-scope'];
      if (scope === 'none') {
        (req as any).claims = { sub: 'u1', tenant_id: 'otomix' };
      } else if (scope === 'wrong-tenant') {
        (req as any).claims = { sub: 'u2', tenant_id: 'otodj' };
      } else {
        (req as any).claims = { sub: 'u1', tenant_id: 'otomix' }; // Assume scope passed
      }
      next();
    });

    const handler = createCatalogFeaturesHandler({ pool: appPool });
    app.get('/api/v1/catalog/features', async (req, res, next) => {
      // Enforce user:read scope mock
      if (req.headers['x-test-scope'] === 'none') {
        return res.status(403).json({ error: 'PERMISSION_DENIED' });
      }
      await handler(req, res, next);
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await adminPool.end();
    await appPool.end();
    await ctr.stop();
  });

  it('paginates 100 -> 100 -> 50 and filters tenant', async () => {
    // Page 1
    const r1 = await request(app).get('/api/v1/catalog/features?limit=100');
    expect(r1.status).toBe(200);
    expect(r1.body.items.length).toBe(100);
    expect(r1.body.next_cursor).not.toBeNull();

    // Page 2
    const r2 = await request(app).get(`/api/v1/catalog/features?limit=100&cursor=${encodeURIComponent(r1.body.next_cursor)}`);
    expect(r2.status).toBe(200);
    expect(r2.body.items.length).toBe(100);
    expect(r2.body.next_cursor).not.toBeNull();

    // Page 3
    const r3 = await request(app).get(`/api/v1/catalog/features?limit=100&cursor=${encodeURIComponent(r2.body.next_cursor)}`);
    expect(r3.status).toBe(200);
    expect(r3.body.items.length).toBe(50);
    expect(r3.body.next_cursor).toBeNull();

    // Check no otodj rows
    const allItems = [...r1.body.items, ...r2.body.items, ...r3.body.items];
    const hasOtodj = allItems.some((item: any) => item.tenant_id === 'otodj');
    expect(hasOtodj).toBe(false);
  });

  it('returns 403 without scope', async () => {
    const res = await request(app)
      .get('/api/v1/catalog/features')
      .set('x-test-scope', 'none');
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid cursor', async () => {
    const res = await request(app).get('/api/v1/catalog/features?cursor=invalid-base64');
    expect(res.status).toBe(400);
  });
});