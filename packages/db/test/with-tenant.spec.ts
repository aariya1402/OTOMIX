import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { withTenant } from '../src/with-tenant';

const TEST_TIMEOUT = 180_000;

describe('withTenant transaction wrapper', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let superClient: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test').withUsername('test').withPassword('test')
      .start();

    superClient = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: 'test', password: 'test', database: 'test', max: 2,
    });

    const sql001 = readFileSync(join(__dirname, '../migrations/001_core.sql'), 'utf-8');
    await superClient.query(sql001.split('-- Down')[0]!);

    const sql002 = readFileSync(join(__dirname, '../migrations/002_rls.sql'), 'utf-8');
    await superClient.query(sql002.split('-- Down')[0]!);

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: 'app_user', password: 'app_user_password', database: 'test', max: 5,
    });

    await superClient.query(`
      INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
        energy_scalar, energy_stars, mixability, groove_mode, registry_json)
      VALUES
        (gen_random_uuid(), 'otomix', gen_random_uuid(), '1.2.0', 120, '1A', 0.5, 3, 0.5, 'straight', '{}'),
        (gen_random_uuid(), 'otodj',  gen_random_uuid(), '1.2.0', 128, '2B', 0.7, 4, 0.6, 'swing', '{}')
    `);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await pool?.end();
    await superClient?.end();
    await container?.stop();
  }, TEST_TIMEOUT);

  it('sets app.tenant_id for the transaction and sees only own rows', async () => {
    const count1 = await withTenant(pool, 'otomix', async (client) => {
      const r = await client.query('SELECT COUNT(*) FROM features');
      return Number(r.rows[0].count);
    });
    expect(count1).toBe(1);

    const count2 = await withTenant(pool, 'otodj', async (client) => {
      const r = await client.query('SELECT COUNT(*) FROM features');
      return Number(r.rows[0].count);
    });
    expect(count2).toBe(1);
  }, TEST_TIMEOUT);

  it('resets app.tenant_id to null/empty after COMMIT', async () => {
    await withTenant(pool, 'otomix', async (client) => {
      await client.query('SELECT 1');
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query("SELECT current_setting('app.tenant_id', true) AS val");
      await client.query('COMMIT');
      expect([null, '']).toContain(r.rows[0].val);
    } finally {
      client.release();
    }
  }, TEST_TIMEOUT);

  it('resets app.tenant_id to null/empty after ROLLBACK', async () => {
    await withTenant(pool, 'otomix', async (client) => {
      await client.query('SELECT 1');
    });

    await expect(
      withTenant(pool, 'otomix', async (client) => {
        await client.query('SELECT 1');
        throw new Error('intentional rollback');
      })
    ).rejects.toThrow('intentional rollback');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query("SELECT current_setting('app.tenant_id', true) AS val");
      await client.query('COMMIT');
      expect([null, '']).toContain(r.rows[0].val);
    } finally {
      client.release();
    }
  }, TEST_TIMEOUT);
});