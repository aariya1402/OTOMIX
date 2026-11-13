import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureBootstrap } from '../src/rbac/bootstrap';
import { computeEffectivePermissions } from '../src/rbac/effective';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const SEED = path.resolve(__dirname, '..', '..', 'db', 'seeds');
let ctr: any; let db: Pool;
const U1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const U2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const U3 = 'aaaaaaaa-0000-4000-8000-000000000003';

async function mig(name: string) {
  const raw = fs.readFileSync(path.join(MIG, name), 'utf8');
  const i = raw.indexOf('-- Down');
  await db.query(i < 0 ? raw : raw.slice(0, i));
}
beforeAll(async () => {
  ctr = await new PostgreSqlContainer('postgres:16-alpine').start();
  db = new Pool({ connectionString: ctr.getConnectionUri() });
  for (const f of ['001_core.sql','002_rls.sql','003_global_features_jsonb.sql','004_rbac.sql','005_admin_audit_default_partition.sql']) await mig(f);
  for (const f of fs.readdirSync(SEED).filter((x: string) => x.endsWith('.sql') && !x.endsWith('.down.sql')).sort()) {
    await db.query(fs.readFileSync(path.join(SEED, f), 'utf8'));
  }
}, 180_000);
afterAll(async () => { await db?.end(); await ctr?.stop(); });

async function insertUser(id: string, tenant: string) {
  await db.query('INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,$2,$3,1) ON CONFLICT DO NOTHING', [id, tenant, 'end_user']);
}
async function effPerms(userId: string, tenantId: string) {
  const ur = await db.query('SELECT ur.role_id, ur.expires_at, ur.revoked_at, r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = $1 AND ur.tenant_id = $2', [userId, tenantId]);
  const roles = [];
  for (const row of ur.rows) {
    const rp = await db.query('SELECT permission_key FROM role_permissions WHERE role_id = $1', [row.role_id]);
    roles.push({ roleId: row.role_id, rolePermissions: rp.rows.map((x: any) => x.permission_key), expiresAt: row.expires_at, revokedAt: row.revoked_at });
  }
  return computeEffectivePermissions({ now: new Date(), userRoles: roles, userPermissions: [], groupPermissions: [] });
}

describe('bootstrap (RBAC-M07)', () => {
  it('(a) first user of otodj gets super_admin with 59 perms', async () => {
    await insertUser(U1, 'otodj');
    const r = await ensureBootstrap(db, { userId: U1, tenantId: 'otodj' });
    expect(r.assignedRole).toBe('super_admin');
    expect(r.isFirstUser).toBe(true);
    const perms = await effPerms(U1, 'otodj');
    expect(perms.size).toBe(59);
  });
  it('(b) second user gets regular_user with 24 perms', async () => {
    await insertUser(U2, 'otodj');
    const r = await ensureBootstrap(db, { userId: U2, tenantId: 'otodj' });
    expect(r.assignedRole).toBe('regular_user');
    const perms = await effPerms(U2, 'otodj');
    expect(perms.size).toBe(24);
  });
  it('(c) third user gets regular_user', async () => {
    await insertUser(U3, 'otodj');
    const r = await ensureBootstrap(db, { userId: U3, tenantId: 'otodj' });
    expect(r.assignedRole).toBe('regular_user');
  });
  it('(d) idempotent: calling twice is safe', async () => {
    const r = await ensureBootstrap(db, { userId: U1, tenantId: 'otodj' });
    expect(r.assignedRole).toBe('super_admin');
    const cnt = await db.query('SELECT COUNT(*)::int AS c FROM user_roles WHERE user_id = $1 AND tenant_id = $2', [U1, 'otodj']);
    expect(cnt.rows[0].c).toBe(1);
  });
  it('(e) audit row written for each bootstrap', async () => {
    const r = await db.query("SELECT COUNT(*)::int AS c FROM admin_audit WHERE action = 'user.bootstrap'");
    expect(r.rows[0].c).toBeGreaterThanOrEqual(3);
  });
  it('(f) otomix tenant separate from otodj', async () => {
    const other = 'bbbbbbbb-0000-4000-8000-000000000001';
    await insertUser(other, 'otomix');
    const r = await ensureBootstrap(db, { userId: other, tenantId: 'otomix' });
    expect(r.assignedRole).toBe('super_admin');
  });
});