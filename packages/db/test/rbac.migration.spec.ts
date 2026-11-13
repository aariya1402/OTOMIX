// GAP-015; OTOMIX §7.1; §9.5
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIG_DIR = path.resolve(__dirname, '..', 'migrations');
const TEST_TIMEOUT = 180_000;

let container: StartedPostgreSqlContainer;
let admin: Pool;

function readMig(name: string): { up: string; down: string } {
  const raw = fs.readFileSync(path.join(MIG_DIR, name), 'utf8');
  const idx = raw.indexOf('-- Down');
  if (idx < 0) return { up: raw, down: '' };
  return { up: raw.slice(0, idx), down: raw.slice(idx + '-- Down'.length) };
}

async function runUp(name: string): Promise<void> {
  const { up } = readMig(name);
  await admin.query(up);
}
async function runDown(name: string): Promise<void> {
  const { down } = readMig(name);
  await admin.query(down);
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  admin = new Pool({ connectionString: container.getConnectionUri() });
  await runUp('001_core.sql');
  await runUp('002_rls.sql');
  await runUp('003_global_features_jsonb.sql');
}, TEST_TIMEOUT);

afterAll(async () => {
  await admin?.end();
  await container?.stop();
}, TEST_TIMEOUT);

describe('004_rbac.sql migration (GAP-015)', () => {
  it('migrate up creates all 8 tables', async () => {
    await runUp('004_rbac.sql');
    const expected = ['permissions','roles','role_permissions','user_roles','user_permissions','groups','group_members','group_permissions'];
    const r = await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1)", [expected]);
    const found = r.rows.map((x: { tablename: string }) => x.tablename).sort();
    expect(found).toEqual(expected.sort());
  });

  it('permissions table has no tenant_id column (global catalog)', async () => {
    const r = await admin.query("SELECT column_name FROM information_schema.columns WHERE table_name='permissions'");
    const cols = r.rows.map((x: { column_name: string }) => x.column_name);
    expect(cols).not.toContain('tenant_id');
    expect(cols).toContain('permission_key');
  });

  it('six tenant tables have relforcerowsecurity=true', async () => {
    const r = await admin.query("SELECT relname, relforcerowsecurity FROM pg_class WHERE relname IN ('roles','role_permissions','user_roles','user_permissions','groups','group_members','group_permissions')");
    expect(r.rows.length).toBe(7);
    for (const row of r.rows) { expect(row.relforcerowsecurity).toBe(true); }
  });

  it('each tenant table has tenant_isolation policy with app.tenant_id', async () => {
    const r = await admin.query("SELECT tablename, qual, with_check FROM pg_policies WHERE policyname='tenant_isolation'");
    expect(r.rows.length).toBeGreaterThanOrEqual(7);
    for (const row of r.rows) {
      expect(String(row.qual)).toContain('app.tenant_id');
      expect(String(row.with_check)).toContain('app.tenant_id');
    }
  });

  it('valid inserts succeed', async () => {
    const u = '11111111-1111-4111-8111-111111111111';
    await admin.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,'otomix','end_user',1) ON CONFLICT DO NOTHING", [u]);
    await admin.query("INSERT INTO permissions (permission_key, category) VALUES ('test:perm','test')");
    const r = await admin.query("INSERT INTO roles (role_name, tenant_id, created_by) VALUES ('r1','otomix',$1) RETURNING role_id", [u]);
    const roleId = r.rows[0].role_id;
    await admin.query("INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by) VALUES ($1,'test:perm','otomix',$2)", [roleId, u]);
    const count = await admin.query("SELECT COUNT(*)::int AS c FROM role_permissions");
    expect(count.rows[0].c).toBe(1);
  });

  it('user_permissions rejects invalid effect', async () => {
    const u = '22222222-2222-4222-8222-222222222222';
    await admin.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,'otomix','end_user',1) ON CONFLICT DO NOTHING", [u]);
    await expect(
      admin.query("INSERT INTO user_permissions (user_id, tenant_id, permission_key, effect, granted_by) VALUES ($1,'otomix','test:perm','maybe',$1)", [u])
    ).rejects.toThrow(/check constraint/i);
  });

  it('roles rejects invalid tenant_id', async () => {
    const u = '33333333-3333-4333-8333-333333333333';
    await admin.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,'otomix','end_user',1) ON CONFLICT DO NOTHING", [u]);
    await expect(
      admin.query("INSERT INTO roles (role_name, tenant_id, created_by) VALUES ('rX','invalid',$1)", [u])
    ).rejects.toThrow(/check constraint/i);
  });

  it('user_roles rejects orphan user_id (FK violation)', async () => {
    const ghost = '99999999-9999-4999-8999-999999999999';
    const u = '44444444-4444-4444-8444-444444444444';
    await admin.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,'otomix','end_user',1) ON CONFLICT DO NOTHING", [u]);
    const r = await admin.query("INSERT INTO roles (role_name, tenant_id, created_by) VALUES ('rFK','otomix',$1) RETURNING role_id", [u]);
    await expect(
      admin.query("INSERT INTO user_roles (user_id, tenant_id, role_id, granted_by) VALUES ($1,'otomix',$2,$3)", [ghost, r.rows[0].role_id, u])
    ).rejects.toThrow(/foreign key/i);
  });

  it('user_permissions rejects orphan permission_key (FK violation)', async () => {
    const u = '55555555-5555-4555-8555-555555555555';
    await admin.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,'otomix','end_user',1) ON CONFLICT DO NOTHING", [u]);
    await expect(
      admin.query("INSERT INTO user_permissions (user_id, tenant_id, permission_key, effect, granted_by) VALUES ($1,'otomix','no:such:perm','allow',$1)", [u])
    ).rejects.toThrow(/foreign key/i);
  });

  it('RLS isolation: app_user sees only own tenant rows', async () => {
    const r = await admin.query("SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user'");
    expect(r.rows[0].rolbypassrls).toBe(false);
  });

  it('migrate down removes all 8 rbac tables', async () => {
    await runDown('004_rbac.sql');
    const expected = ['permissions','roles','role_permissions','user_roles','user_permissions','groups','group_members','group_permissions'];
    const r = await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1)", [expected]);
    expect(r.rows.length).toBe(0);
    const core = await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','tier_grants','admin_audit','outbox')");
    expect(core.rows.length).toBe(4);
  });

  it('round-trip: up -> down -> up succeeds', async () => {
    await runUp('004_rbac.sql');
    const r = await admin.query("SELECT COUNT(*)::int AS c FROM pg_tables WHERE schemaname='public' AND tablename='permissions'");
    expect(r.rows[0].c).toBe(1);
  });
});