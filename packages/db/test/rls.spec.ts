import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_TIMEOUT = 180_000;

describe('RLS tenant_isolation', () => {
  let container: StartedPostgreSqlContainer;
  let superClient: Client;
  let otomixClient: Client;
  let otodjClient: Client;
  let unsetClient: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test').withUsername('test').withPassword('test')
      .start();

    superClient = new Client({
      host: container.getHost(), port: container.getMappedPort(5432),
      user: 'test', password: 'test', database: 'test',
    });
    await superClient.connect();

    // Apply both migrations
    const sql001 = readFileSync(join(__dirname, '../migrations/001_core.sql'), 'utf-8');
    const up001 = sql001.split('-- Down')[0];
    await superClient.query(up001);

    const sql002 = readFileSync(join(__dirname, '../migrations/002_rls.sql'), 'utf-8');
    const up002 = sql002.split('-- Down')[0];
    await superClient.query(up002);

    // Seed all 5 tables: 1 row per tenant each
    const U_OM = '00000000-0000-4000-8000-000000000001';
    const U_OD = '00000000-0000-4000-8000-000000000002';
    await superClient.query(`
      INSERT INTO users (user_id, tenant_id, role, tier) VALUES
        ($1, 'otomix', 'end_user', 1),
        ($2, 'otodj',  'end_user', 1)
    `, [U_OM, U_OD]);

    await superClient.query(`
      INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json) VALUES
        (gen_random_uuid(), 'otomix', gen_random_uuid(), '1.2.0', 120, '1A', 0.5, 3, 0.5, 'straight', '{}'),
        (gen_random_uuid(), 'otodj',  gen_random_uuid(), '1.2.0', 128, '2B', 0.7, 4, 0.6, 'swing', '{}')
    `);

    await superClient.query(`
      INSERT INTO tier_grants (grant_id, tenant_id, user_id, feature, expires_at) VALUES
        (gen_random_uuid(), 'otomix', $1, 'lossless_export', '2026-12-31T00:00:00Z'),
        (gen_random_uuid(), 'otodj',  $2, 'lossless_export', '2026-12-31T00:00:00Z')
    `, [U_OM, U_OD]);

    await superClient.query(`
      INSERT INTO admin_audit (audit_id, tenant_id, actor_id, action, detail, at_utc) VALUES
        (gen_random_uuid(), 'otomix', $1, 'test_action', '{}', '2026-01-15 12:00:00+00'),
        (gen_random_uuid(), 'otodj',  $2, 'test_action', '{}', '2026-01-15 12:00:00+00')
    `, [U_OM, U_OD]);

    await superClient.query(`
      INSERT INTO outbox (message_id, tenant_id, topic, payload) VALUES
        (gen_random_uuid(), 'otomix', 'test_topic', '{}'),
        (gen_random_uuid(), 'otodj',  'test_topic', '{}')
    `);

    // Three app_user sessions (session-local set_config)
    const appCfg = {
      host: container.getHost(), port: container.getMappedPort(5432),
      user: 'app_user', password: 'app_user_password', database: 'test',
    };

    otomixClient = new Client(appCfg);
    await otomixClient.connect();
    await otomixClient.query("SELECT set_config('app.tenant_id', 'otomix', false)");

    otodjClient = new Client(appCfg);
    await otodjClient.connect();
    await otodjClient.query("SELECT set_config('app.tenant_id', 'otodj', false)");

    unsetClient = new Client(appCfg);
    await unsetClient.connect();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (unsetClient) await unsetClient.end();
    if (otodjClient) await otodjClient.end();
    if (otomixClient) await otomixClient.end();
    if (superClient) await superClient.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  // ---- features ----
  it('features: otomix sees 1 row', async () => {
    const r = await otomixClient.query('SELECT COUNT(*) FROM features');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('features: otodj sees 1 row', async () => {
    const r = await otodjClient.query('SELECT COUNT(*) FROM features');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('features: unset sees 0 rows', async () => {
    const r = await unsetClient.query('SELECT COUNT(*) FROM features');
    expect(Number(r.rows[0].count)).toBe(0);
  });

  // ---- users ----
  it('users: otomix sees 1 row', async () => {
    const r = await otomixClient.query('SELECT COUNT(*) FROM users');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('users: otodj sees 1 row', async () => {
    const r = await otodjClient.query('SELECT COUNT(*) FROM users');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('users: unset sees 0 rows', async () => {
    const r = await unsetClient.query('SELECT COUNT(*) FROM users');
    expect(Number(r.rows[0].count)).toBe(0);
  });

  // ---- tier_grants ----
  it('tier_grants: otomix sees 1 row', async () => {
    const r = await otomixClient.query('SELECT COUNT(*) FROM tier_grants');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('tier_grants: otodj sees 1 row', async () => {
    const r = await otodjClient.query('SELECT COUNT(*) FROM tier_grants');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('tier_grants: unset sees 0 rows', async () => {
    const r = await unsetClient.query('SELECT COUNT(*) FROM tier_grants');
    expect(Number(r.rows[0].count)).toBe(0);
  });

  // ---- admin_audit ----
  it('admin_audit: otomix sees 1 row', async () => {
    const r = await otomixClient.query('SELECT COUNT(*) FROM admin_audit');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('admin_audit: otodj sees 1 row', async () => {
    const r = await otodjClient.query('SELECT COUNT(*) FROM admin_audit');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('admin_audit: unset sees 0 rows', async () => {
    const r = await unsetClient.query('SELECT COUNT(*) FROM admin_audit');
    expect(Number(r.rows[0].count)).toBe(0);
  });

  // ---- outbox ----
  it('outbox: otomix sees 1 row', async () => {
    const r = await otomixClient.query('SELECT COUNT(*) FROM outbox');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('outbox: otodj sees 1 row', async () => {
    const r = await otodjClient.query('SELECT COUNT(*) FROM outbox');
    expect(Number(r.rows[0].count)).toBe(1);
  });
  it('outbox: unset sees 0 rows', async () => {
    const r = await unsetClient.query('SELECT COUNT(*) FROM outbox');
    expect(Number(r.rows[0].count)).toBe(0);
  });

  // ---- metadata checks ----
  it('app_user has rolbypassrls=false', async () => {
    const r = await superClient.query("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'app_user'");
    expect(r.rows[0].rolbypassrls).toBe(false);
  });

  it('all 5 tables have relforcerowsecurity=true', async () => {
    const r = await superClient.query(`
      SELECT relname, relforcerowsecurity FROM pg_class
      WHERE relname IN ('features','users','tier_grants','admin_audit','outbox')
      ORDER BY relname
    `);
    expect(r.rows.length).toBe(5);
    for (const row of r.rows) expect(row.relforcerowsecurity).toBe(true);
  });

  it('5 tenant_isolation policies exist with current_setting expression', async () => {
    const r = await superClient.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) AS qual_text
      FROM pg_policy WHERE polname = 'tenant_isolation'
    `);
    expect(r.rows.length).toBe(5);
    for (const row of r.rows) {
      expect(row.qual_text).toContain("current_setting('app.tenant_id'::text, true)");
    }
  });
});