// GAP-015, RBAC-M03
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIG_DIR = path.resolve(__dirname, '..', 'migrations');
const SEED_DIR = path.resolve(__dirname, '..', 'seeds');
const TEST_TIMEOUT = 180_000;

let container: StartedPostgreSqlContainer;
let admin: Pool;

function readMig(name: string): string {
  const raw = fs.readFileSync(path.join(MIG_DIR, name), 'utf8');
  const idx = raw.indexOf('-- Down');
  return idx < 0 ? raw : raw.slice(0, idx);
}
async function runUp(name: string): Promise<void> { await admin.query(readMig(name)); }
async function runSeeds(): Promise<void> {
  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(SEED_DIR, f), 'utf8');
    await admin.query(sql);
  }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  admin = new Pool({ connectionString: container.getConnectionUri() });
  await runUp('001_core.sql');
  await runUp('002_rls.sql');
  await runUp('003_global_features_jsonb.sql');
  await runUp('004_rbac.sql');
}, TEST_TIMEOUT);

afterAll(async () => {
  await admin?.end();
  await container?.stop();
}, TEST_TIMEOUT);

describe('roles.seed.sql (RBAC-M03)', () => {
  it('seeds 9 roles x 2 tenants = 18 roles; idempotent', async () => {
    await runSeeds();
    const c1 = await admin.query("SELECT COUNT(*)::int AS c FROM roles");
    await runSeeds();
    const c2 = await admin.query("SELECT COUNT(*)::int AS c FROM roles");
    expect(c2.rows[0].c).toBe(c1.rows[0].c);
    expect(c1.rows[0].c).toBe(18);
  });

  it('all 9 base roles present per tenant', async () => {
    const names = ['regular_user','tier_1','tier_2','dsp_specialist','content_specialist','customer_care','accountant','deputy_admin','super_admin'];
    for (const tenant of ['otomix','otodj']) {
      const r = await admin.query("SELECT role_name FROM roles WHERE tenant_id=$1", [tenant]);
      const found = r.rows.map((x: { role_name: string }) => x.role_name).sort();
      expect(found).toEqual(names.sort());
    }
  });

  it('all 9 base roles have is_system = true', async () => {
    const r = await admin.query("SELECT COUNT(*)::int AS c FROM roles WHERE is_system = false");
    expect(r.rows[0].c).toBe(0);
  });

  it('super_admin has all 59 permissions (55 base + 4 admin)', async () => {
    const r = await admin.query("SELECT COUNT(*)::int AS c FROM permissions");
    expect(r.rows[0].c).toBe(59);
    for (const tenant of ['otomix','otodj']) {
      const rp = await admin.query(
        "SELECT COUNT(*)::int AS c FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name='super_admin' AND r.tenant_id=$1",
        [tenant]
      );
      expect(rp.rows[0].c).toBe(59);
    }
  });

  it('super_admin includes admin:user_grants and admin:permissions_catalog', async () => {
    const r = await admin.query(
      "SELECT p.permission_key FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id JOIN permissions p ON rp.permission_key = p.permission_key WHERE r.role_name='super_admin' AND r.tenant_id='otomix' AND p.permission_key IN ('admin:user_grants','admin:permissions_catalog')"
    );
    expect(r.rows.length).toBe(2);
  });

  it('deputy_admin = super_admin minus admin:super_admin_only (58 keys)', async () => {
    for (const tenant of ['otomix','otodj']) {
      const rp = await admin.query(
        "SELECT COUNT(*)::int AS c FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name='deputy_admin' AND r.tenant_id=$1",
        [tenant]
      );
      expect(rp.rows[0].c).toBe(58);
      const noSuperOnly = await admin.query(
        "SELECT COUNT(*)::int AS c FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name='deputy_admin' AND r.tenant_id=$1 AND rp.permission_key = 'admin:super_admin_only'",
        [tenant]
      );
      expect(noSuperOnly.rows[0].c).toBe(0);
    }
  });

  it('deputy_admin is a strict subset of super_admin', async () => {
    const extra = await admin.query(
      "SELECT rp_d.permission_key FROM role_permissions rp_d JOIN roles rd ON rp_d.role_id = rd.role_id LEFT JOIN role_permissions rp_s ON rp_s.permission_key = rp_d.permission_key LEFT JOIN roles rs ON rp_s.role_id = rs.role_id AND rs.role_name = 'super_admin' AND rs.tenant_id = rd.tenant_id WHERE rd.role_name = 'deputy_admin' AND rd.tenant_id = 'otomix' AND rp_s.permission_key IS NULL"
    );
    expect(extra.rows.length).toBe(0);
  });

  it('regular_user has no admin:* keys and no export:xml/export:audio', async () => {
    const adminKeys = await admin.query(
      "SELECT COUNT(*)::int AS c FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name='regular_user' AND r.tenant_id='otomix' AND (rp.permission_key LIKE 'admin:%' OR rp.permission_key LIKE 'sys:%' OR rp.permission_key LIKE 'users:%' OR rp.permission_key LIKE 'billing:%')"
    );
    expect(adminKeys.rows[0].c).toBe(0);
    const premium = await admin.query(
      "SELECT COUNT(*)::int AS c FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name='regular_user' AND r.tenant_id='otomix' AND rp.permission_key IN ('export:xml','export:audio')"
    );
    expect(premium.rows[0].c).toBe(0);
  });
});