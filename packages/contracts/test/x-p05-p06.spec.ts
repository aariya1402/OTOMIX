import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
let container: StartedPostgreSqlContainer;
let pg: Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pg = new Pool({ connectionString: container.getConnectionUri() });
  for (const f of ['001_core.sql','002_rls.sql','003_global_features_jsonb.sql','004_rbac.sql','005_admin_audit_default_partition.sql']) {
    const raw = fs.readFileSync(path.join(MIG, f), 'utf8');
    const i = raw.indexOf('-- Down');
    await pg.query(i < 0 ? raw : raw.slice(0, i));
  }
}, 180_000);
afterAll(async () => { await pg?.end(); await container?.stop(); });

describe('X-P05-P06: tenant isolation (structural)', () => {
  it('users table has FORCE ROW LEVEL SECURITY', async () => {
    const r = await pg.query("SELECT relforcerowsecurity FROM pg_class WHERE relname='users'");
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].relforcerowsecurity).toBe(true);
  });

  it('users has tenant_isolation policy referencing app.tenant_id', async () => {
    const r = await pg.query("SELECT qual, with_check FROM pg_policies WHERE tablename='users' AND policyname='tenant_isolation'");
    expect(r.rows.length).toBeGreaterThanOrEqual(1);
    expect(String(r.rows[0].qual)).toMatch(/app\.tenant_id/);
    expect(String(r.rows[0].with_check)).toMatch(/app\.tenant_id/);
  });

  it('app_user role does NOT bypass RLS', async () => {
    const r = await pg.query("SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user'");
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].rolbypassrls).toBe(false);
  });
});