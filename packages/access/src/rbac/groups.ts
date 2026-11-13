import type { Pool, PoolClient } from 'pg';
import type Redis from 'ioredis';
import { publishInvalidation } from './cache';

export interface ActorContext { actorUserId: string; actorTenantId: string; }
export interface CreateGroupInput { name: string; tenantId: string; }
export interface DeleteGroupInput { groupId: string; tenantId: string; }
export interface AddMemberInput { groupId: string; userId: string; tenantId: string; }
export interface RemoveMemberInput { groupId: string; userId: string; tenantId: string; }
export interface GrantGroupPermissionInput { groupId: string; permissionKey: string; tenantId: string; effect: 'allow' | 'deny'; expiresAt?: Date | null; }
export interface RevokeGroupPermissionInput { groupId: string; permissionKey: string; tenantId: string; }
export interface GroupResult { groupId: string; }
export interface GrantGroupPermissionResult { grantId: string; }

export class GroupsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'GroupsError'; this.code = code; }
}
export class UnauthorizedGroupsError extends GroupsError { constructor(m: string) { super('PERMISSION_DENIED', m); this.name = 'UnauthorizedGroupsError'; } }
export class InvalidGroupsInputError extends GroupsError { constructor(m: string) { super('INVALID_ARGUMENT', m); this.name = 'InvalidGroupsInputError'; } }
export class GroupNotFoundError extends GroupsError { constructor(m: string) { super('NOT_FOUND', m); this.name = 'GroupNotFoundError'; } }

export interface GroupsServiceDeps {
  pg: Pool;
  redis?: Redis;
  webhookFn?: (p: { actor: string; scope: string; tenant: string; timestamp: string }) => Promise<void>;
}

async function actorHasPermission(client: PoolClient, actorUserId: string, actorTenantId: string, permissionKey: string): Promise<boolean> {
  const sql = `
    SELECT 1 FROM (
      SELECT rp.permission_key FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1 AND ur.tenant_id = $2
      AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at > now())
      UNION ALL
      SELECT up.permission_key FROM user_permissions up
      WHERE up.user_id = $1 AND up.tenant_id = $2 AND up.effect = 'allow'
      AND up.revoked_at IS NULL AND (up.expires_at IS NULL OR up.expires_at > now())
    ) t WHERE t.permission_key = $3 LIMIT 1
  `;
  const r = await client.query(sql, [actorUserId, actorTenantId, permissionKey]);
  return r.rows.length > 0;
}

async function assertActor(client: PoolClient, ctx: ActorContext, targetTenantId: string): Promise<void> {
  if (ctx.actorTenantId !== targetTenantId) throw new UnauthorizedGroupsError('cross-tenant group operation not allowed');
  const ok = await actorHasPermission(client, ctx.actorUserId, ctx.actorTenantId, 'admin:user_grants');
  if (!ok) throw new UnauthorizedGroupsError('actor lacks admin:user_grants');
}

async function writeAudit(client: PoolClient, ctx: ActorContext, action: string, detail: any): Promise<void> {
  await client.query(
    'INSERT INTO admin_audit (audit_id, tenant_id, actor_id, action, detail, at_utc) VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, now())',
    [ctx.actorTenantId, ctx.actorUserId, action, JSON.stringify(detail)]
  );
}

export function createGroupsService(deps: GroupsServiceDeps) {
  const pg = deps.pg;
  const redis = deps.redis;
  const webhook = deps.webhookFn ?? (async () => {});

  function fireWebhook(actor: string, scope: string, tenant: string): void {
    const p = { actor, scope, tenant, timestamp: new Date().toISOString() };
    webhook(p).catch(() => {});
  }

  async function withTx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pg.connect();
    try {
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }

  async function invalidateMembers(groupId: string, tenantId: string): Promise<void> {
    if (!redis) return;
    const m = await pg.query('SELECT user_id FROM group_members WHERE group_id=$1 AND tenant_id=$2', [groupId, tenantId]);
    for (const row of m.rows) {
      try { await publishInvalidation(redis, { userId: row.user_id, tenantId }); } catch { /* ignore */ }
    }
  }

  async function createGroup(ctx: ActorContext, i: CreateGroupInput): Promise<GroupResult> {
    return withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, i.tenantId);
      const r = await c.query('INSERT INTO groups (tenant_id, name, created_by) VALUES ($1, $2, $3) RETURNING group_id', [i.tenantId, i.name, ctx.actorUserId]);
      await writeAudit(c, ctx, 'group.create', { group_id: r.rows[0].group_id, tenant_id: i.tenantId, name: i.name });
      return { groupId: r.rows[0].group_id };
    });
  }

  async function deleteGroup(ctx: ActorContext, i: DeleteGroupInput): Promise<void> {
    await withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, i.tenantId);
      const r = await c.query('SELECT 1 FROM groups WHERE group_id=$1 AND tenant_id=$2', [i.groupId, i.tenantId]);
      if (r.rows.length === 0) throw new GroupNotFoundError('group not found');
      await c.query('DELETE FROM groups WHERE group_id=$1 AND tenant_id=$2', [i.groupId, i.tenantId]);
      await writeAudit(c, ctx, 'group.delete', { group_id: i.groupId, tenant_id: i.tenantId });
    });
    await invalidateMembers(i.groupId, i.tenantId);
  }

  async function addMember(ctx: ActorContext, i: AddMemberInput): Promise<void> {
    await withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, i.tenantId);
      const g = await c.query('SELECT 1 FROM groups WHERE group_id=$1 AND tenant_id=$2', [i.groupId, i.tenantId]);
      if (g.rows.length === 0) throw new GroupNotFoundError('group not found');
      const u = await c.query('SELECT 1 FROM users WHERE user_id=$1 AND tenant_id=$2', [i.userId, i.tenantId]);
      if (u.rows.length === 0) throw new GroupNotFoundError('user not found');
      await c.query('INSERT INTO group_members (group_id, user_id, tenant_id, added_at, added_by) VALUES ($1,$2,$3,now(),$4) ON CONFLICT (group_id, user_id) DO NOTHING', [i.groupId, i.userId, i.tenantId, ctx.actorUserId]);
      await writeAudit(c, ctx, 'group.member.add', { group_id: i.groupId, user_id: i.userId, tenant_id: i.tenantId });
    });
    await invalidateMembers(i.groupId, i.tenantId);
  }

  async function removeMember(ctx: ActorContext, i: RemoveMemberInput): Promise<void> {
    await withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, i.tenantId);
      await c.query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2 AND tenant_id=$3', [i.groupId, i.userId, i.tenantId]);
      await writeAudit(c, ctx, 'group.member.remove', { group_id: i.groupId, user_id: i.userId, tenant_id: i.tenantId });
    });
    if (redis) { try { await publishInvalidation(redis, { userId: i.userId, tenantId: i.tenantId }); } catch { /* ignore */ } }
  }

  async function grantGroupPermission(ctx: ActorContext, i: GrantGroupPermissionInput): Promise<GrantGroupPermissionResult> {
    if (i.effect !== 'allow' && i.effect !== 'deny') throw new InvalidGroupsInputError('effect must be allow or deny');
    if (i.expiresAt && i.expiresAt.getTime() <= Date.now()) throw new InvalidGroupsInputError('expiresAt must be future');
    const result = await withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, i.tenantId);
      const g = await c.query('SELECT 1 FROM groups WHERE group_id=$1 AND tenant_id=$2', [i.groupId, i.tenantId]);
      if (g.rows.length === 0) throw new GroupNotFoundError('group not found');
      const p = await c.query('SELECT 1 FROM permissions WHERE permission_key=$1', [i.permissionKey]);
      if (p.rows.length === 0) throw new GroupNotFoundError('permission not found');
      await c.query('INSERT INTO group_permissions (group_id, permission_key, tenant_id, effect, granted_at, granted_by, expires_at) VALUES ($1,$2,$3,$4,now(),$5,$6) ON CONFLICT (group_id, permission_key) DO UPDATE SET effect=EXCLUDED.effect, granted_at=now(), granted_by=EXCLUDED.granted_by, expires_at=EXCLUDED.expires_at, revoked_at=NULL, revoked_by=NULL', [i.groupId, i.permissionKey, i.tenantId, i.effect, ctx.actorUserId, i.expiresAt ?? null]);
      await writeAudit(c, ctx, 'group.permission.grant', { group_id: i.groupId, permission_key: i.permissionKey, tenant_id: i.tenantId, effect: i.effect });
      fireWebhook(ctx.actorUserId, 'group.permission.grant:' + i.permissionKey, i.tenantId);
      return { grantId: i.permissionKey };
    });
    await invalidateMembers(i.groupId, i.tenantId);
    return result;
  }

  async function revokeGroupPermission(ctx: ActorContext, i: RevokeGroupPermissionInput): Promise<void> {
    await withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, i.tenantId);
      await c.query('UPDATE group_permissions SET revoked_at=now(), revoked_by=$1 WHERE group_id=$2 AND permission_key=$3 AND tenant_id=$4 AND revoked_at IS NULL', [ctx.actorUserId, i.groupId, i.permissionKey, i.tenantId]);
      await writeAudit(c, ctx, 'group.permission.revoke', { group_id: i.groupId, permission_key: i.permissionKey, tenant_id: i.tenantId });
      fireWebhook(ctx.actorUserId, 'group.permission.revoke:' + i.permissionKey, i.tenantId);
    });
    await invalidateMembers(i.groupId, i.tenantId);
  }

  return { createGroup, deleteGroup, addMember, removeMember, grantGroupPermission, revokeGroupPermission };
}
export type GroupsService = ReturnType<typeof createGroupsService>;