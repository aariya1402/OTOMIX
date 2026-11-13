import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createGroupsService } from '../src/rbac/groups';
import { computeEffectivePermissions } from '../src/rbac/effective';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const SEED = path.resolve(__dirname, '..', '..', 'db', 'seeds');
let ctr: any; let db: Pool;
const SUPER = 'aaaaaaaa-0000-4000-8000-000000000001';
const SYS = '00000000-0000-0000-0000-000000000001';
const U1 = 'aaaaaaaa-0000-4000-8000-000000000010';
const U2 = 'aaaaaaaa-0000-4000-8000-000000000011';
const T = 'otomix';
let webhookCalls: any[] = [];

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
  for (const uid of [SUPER, U1, U2]) {
    await db.query('INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,$2,$3,1) ON CONFLICT DO NOTHING', [uid, T, 'end_user']);
  }
  await db.query('INSERT INTO user_roles (user_id, tenant_id, role_id, granted_at, granted_by) SELECT $1, $2, role_id, now(), $3 FROM roles WHERE role_name = $4 AND tenant_id = $2', [SUPER, T, SYS, 'super_admin']);
}, 180_000);
afterAll(async () => { await db?.end(); await ctr?.stop(); });

async function effPermsOf(userId: string, now: Date) {
  const ur = await db.query('SELECT ur.role_id, ur.expires_at, ur.revoked_at FROM user_roles ur WHERE ur.user_id = $1 AND ur.tenant_id = $2', [userId, T]);
  const roles = [];
  for (const row of ur.rows) {
    const rp = await db.query('SELECT permission_key FROM role_permissions WHERE role_id = $1', [row.role_id]);
    roles.push({ roleId: row.role_id, rolePermissions: rp.rows.map((x: any) => x.permission_key), expiresAt: row.expires_at, revokedAt: row.revoked_at });
  }
  const gm = await db.query('SELECT gp.permission_key, gp.effect, gp.expires_at, gp.revoked_at FROM group_members gm JOIN group_permissions gp ON gp.group_id = gm.group_id AND gp.tenant_id = gm.tenant_id WHERE gm.user_id = $1 AND gm.tenant_id = $2', [userId, T]);
  const groups = gm.rows.map((x: any) => ({ permissionKey: x.permission_key, effect: x.effect, expiresAt: x.expires_at, revokedAt: x.revoked_at, groupActive: true }));
  return computeEffectivePermissions({ now, userRoles: roles, userPermissions: [], groupPermissions: groups });
}

const ctx = { actorUserId: SUPER, actorTenantId: T };
let groupId = '';

describe('groups service (RBAC-M08)', () => {
  it('(a) createGroup -> groups row', async () => {
    const svc = createGroupsService({ pg: db, webhookFn: (p: any) => { webhookCalls.push(p); return Promise.resolve(); } });
    const r = await svc.createGroup(ctx, { name: 'team-a', tenantId: T });
    groupId = r.groupId;
    expect(groupId).toBeTruthy();
    const row = await db.query('SELECT name FROM groups WHERE group_id = $1', [groupId]);
    expect(row.rows[0].name).toBe('team-a');
  });
  it('(b) addMember x2 -> 2 group_members rows', async () => {
    const svc = createGroupsService({ pg: db });
    await svc.addMember(ctx, { groupId, userId: U1, tenantId: T });
    await svc.addMember(ctx, { groupId, userId: U2, tenantId: T });
    const r = await db.query('SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = $1', [groupId]);
    expect(r.rows[0].c).toBe(2);
  });
  it('(c) grantGroupPermission set:edit 1h -> group_permissions row + webhook', async () => {
    webhookCalls = [];
    const svc = createGroupsService({ pg: db, webhookFn: (p: any) => { webhookCalls.push(p); return Promise.resolve(); } });
    const exp = new Date(Date.now() + 3600_000);
    await svc.grantGroupPermission(ctx, { groupId, permissionKey: 'set:update', tenantId: T, effect: 'allow', expiresAt: exp });
    const row = await db.query('SELECT expires_at FROM group_permissions WHERE group_id = $1 AND permission_key = $2', [groupId, 'set:update']);
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].expires_at).not.toBeNull();
    expect(webhookCalls.length).toBe(1);
  });
  it('(d) both members have set:update via computeEffectivePermissions', async () => {
    const now = new Date();
    const p1 = await effPermsOf(U1, now);
    const p2 = await effPermsOf(U2, now);
    expect(p1.has('set:update')).toBe(true);
    expect(p2.has('set:update')).toBe(true);
  });
  it('(e) removeMember(U2) -> U2 loses set:update', async () => {
    const svc = createGroupsService({ pg: db });
    await svc.removeMember(ctx, { groupId, userId: U2, tenantId: T });
    const now = new Date();
    const p2 = await effPermsOf(U2, now);
    expect(p2.has('set:update')).toBe(false);
    const p1 = await effPermsOf(U1, now);
    expect(p1.has('set:update')).toBe(true);
  });
  it('(f) expiry: now + 2h -> U1 loses set:update', async () => {
    const future = new Date(Date.now() + 7200_000);
    const p1 = await effPermsOf(U1, future);
    expect(p1.has('set:update')).toBe(false);
  });
  it('(g) deleteGroup cascades', async () => {
    const svc = createGroupsService({ pg: db });
    await svc.deleteGroup(ctx, { groupId, tenantId: T });
    const g = await db.query('SELECT COUNT(*)::int AS c FROM groups WHERE group_id = $1', [groupId]);
    const m = await db.query('SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = $1', [groupId]);
    const p = await db.query('SELECT COUNT(*)::int AS c FROM group_permissions WHERE group_id = $1', [groupId]);
    expect(g.rows[0].c).toBe(0);
    expect(m.rows[0].c).toBe(0);
    expect(p.rows[0].c).toBe(0);
  });
  it('(h) audit rows exist for each operation', async () => {
    const r = await db.query("SELECT COUNT(*)::int AS c FROM admin_audit WHERE action IN ('group.create','group.member.add','group.member.remove','group.permission.grant','group.delete')");
    expect(r.rows[0].c).toBeGreaterThanOrEqual(5);
  });
});