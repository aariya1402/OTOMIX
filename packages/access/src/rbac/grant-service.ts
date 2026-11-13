import type { Pool, PoolClient } from 'pg';

export interface ActorContext { actorUserId: string; actorTenantId: string; }
export interface GrantResult { grantId: string; }
export interface GrantRoleInput { userId: string; tenantId: string; roleName: string; expiresAt?: Date | null; }
export interface GrantPermissionInput { userId: string; tenantId: string; permissionKey: string; effect: 'allow' | 'deny'; expiresAt?: Date | null; }
export interface RevokeRoleInput { userId: string; tenantId: string; roleName: string; }
export interface RevokePermissionInput { userId: string; tenantId: string; permissionKey: string; }

export class GrantError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'GrantError'; this.code = code; }
}
export class UnauthorizedGrantError extends GrantError { constructor(m: string) { super('PERMISSION_DENIED', m); this.name = 'UnauthorizedGrantError'; } }
export class InvalidGrantInputError extends GrantError { constructor(m: string) { super('INVALID_ARGUMENT', m); this.name = 'InvalidGrantInputError'; } }
export class TargetNotFoundError extends GrantError { constructor(m: string) { super('NOT_FOUND', m); this.name = 'TargetNotFoundError'; } }

export interface GrantServiceDeps {
  pg: Pool;
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
      UNION ALL
      SELECT gp.permission_key FROM group_members gm
      JOIN group_permissions gp ON gp.group_id = gm.group_id
      WHERE gm.user_id = $1 AND gm.tenant_id = $2 AND gp.effect = 'allow'
      AND gp.revoked_at IS NULL AND (gp.expires_at IS NULL OR gp.expires_at > now())
    ) t WHERE t.permission_key = $3 LIMIT 1
  `;
  const r = await client.query(sql, [actorUserId, actorTenantId, permissionKey]);
  return r.rows.length > 0;
}

async function assertActor(client: PoolClient, ctx: ActorContext, required: string, targetTenantId: string): Promise<void> {
  if (ctx.actorTenantId !== targetTenantId) throw new UnauthorizedGrantError('cross-tenant grant not allowed');
  const ok = await actorHasPermission(client, ctx.actorUserId, ctx.actorTenantId, required);
  if (!ok) throw new UnauthorizedGrantError('actor lacks ' + required);
}

async function writeAudit(client: PoolClient, ctx: ActorContext, action: string, detail: any): Promise<void> {
  await client.query('INSERT INTO admin_audit (audit_id, tenant_id, actor_id, action, detail, at_utc) VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, now())', [ctx.actorTenantId, ctx.actorUserId, action, JSON.stringify(detail)]);
}

export function createGrantService(deps: GrantServiceDeps) {
  const webhook = deps.webhookFn ?? (async () => {});
  const pg = deps.pg;
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
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async function grantRole(ctx: ActorContext, i: GrantRoleInput): Promise<GrantResult> {
    if (i.expiresAt && i.expiresAt.getTime() <= Date.now()) throw new InvalidGrantInputError('expiresAt must be future');
    const req = i.roleName === 'super_admin' ? 'admin:super_admin_only' : 'admin:user_grants';
    return withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, req, i.tenantId);
      const r = await c.query('SELECT role_id FROM roles WHERE role_name=$1 AND tenant_id=$2', [i.roleName, i.tenantId]);
      if (r.rows.length === 0) throw new TargetNotFoundError('role not found');
      const u = await c.query('SELECT 1 FROM users WHERE user_id=$1 AND tenant_id=$2', [i.userId, i.tenantId]);
      if (u.rows.length === 0) throw new TargetNotFoundError('user not found');
      const rid = r.rows[0].role_id;
      await c.query('INSERT INTO user_roles (user_id, tenant_id, role_id, granted_at, granted_by, expires_at) VALUES ($1,$2,$3,now(),$4,$5) ON CONFLICT (user_id, tenant_id, role_id) DO UPDATE SET granted_at=now(), granted_by=EXCLUDED.granted_by, expires_at=EXCLUDED.expires_at, revoked_at=NULL, revoked_by=NULL', [i.userId, i.tenantId, rid, ctx.actorUserId, i.expiresAt ?? null]);
      await writeAudit(c, ctx, 'role.grant', { user_id: i.userId, tenant_id: i.tenantId, role_name: i.roleName });
      fireWebhook(ctx.actorUserId, 'role.grant:' + i.roleName, i.tenantId);
      return { grantId: rid };
    });
  }
  async function revokeRole(ctx: ActorContext, i: RevokeRoleInput): Promise<void> {
    return withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, 'admin:user_grants', i.tenantId);
      const r = await c.query('SELECT role_id FROM roles WHERE role_name=$1 AND tenant_id=$2', [i.roleName, i.tenantId]);
      if (r.rows.length === 0) throw new TargetNotFoundError('role not found');
      await c.query('UPDATE user_roles SET revoked_at=now(), revoked_by=$1 WHERE user_id=$2 AND tenant_id=$3 AND role_id=$4 AND revoked_at IS NULL', [ctx.actorUserId, i.userId, i.tenantId, r.rows[0].role_id]);
      await writeAudit(c, ctx, 'role.revoke', { user_id: i.userId, tenant_id: i.tenantId, role_name: i.roleName });
      fireWebhook(ctx.actorUserId, 'role.revoke:' + i.roleName, i.tenantId);
    });
  }
  async function grantPermission(ctx: ActorContext, i: GrantPermissionInput): Promise<GrantResult> {
    if (i.effect !== 'allow' && i.effect !== 'deny') throw new InvalidGrantInputError('effect must be allow or deny');
    if (i.expiresAt && i.expiresAt.getTime() <= Date.now()) throw new InvalidGrantInputError('expiresAt must be future');
    const req = i.permissionKey === 'admin:super_admin_only' ? 'admin:super_admin_only' : 'admin:user_grants';
    return withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, req, i.tenantId);
      const p = await c.query('SELECT 1 FROM permissions WHERE permission_key=$1', [i.permissionKey]);
      if (p.rows.length === 0) throw new TargetNotFoundError('permission not found');
      const u = await c.query('SELECT 1 FROM users WHERE user_id=$1 AND tenant_id=$2', [i.userId, i.tenantId]);
      if (u.rows.length === 0) throw new TargetNotFoundError('user not found');
      await c.query('INSERT INTO user_permissions (user_id, tenant_id, permission_key, effect, granted_at, granted_by, expires_at) VALUES ($1,$2,$3,$4,now(),$5,$6) ON CONFLICT (user_id, tenant_id, permission_key) DO UPDATE SET effect=EXCLUDED.effect, granted_at=now(), granted_by=EXCLUDED.granted_by, expires_at=EXCLUDED.expires_at, revoked_at=NULL, revoked_by=NULL', [i.userId, i.tenantId, i.permissionKey, i.effect, ctx.actorUserId, i.expiresAt ?? null]);
      await writeAudit(c, ctx, 'permission.grant', { user_id: i.userId, tenant_id: i.tenantId, permission_key: i.permissionKey, effect: i.effect });
      fireWebhook(ctx.actorUserId, 'permission.grant:' + i.permissionKey, i.tenantId);
      return { grantId: i.permissionKey };
    });
  }
  async function revokePermission(ctx: ActorContext, i: RevokePermissionInput): Promise<void> {
    return withTx(ctx.actorTenantId, async (c) => {
      await assertActor(c, ctx, 'admin:user_grants', i.tenantId);
      await c.query('UPDATE user_permissions SET revoked_at=now(), revoked_by=$1 WHERE user_id=$2 AND tenant_id=$3 AND permission_key=$4 AND revoked_at IS NULL', [ctx.actorUserId, i.userId, i.tenantId, i.permissionKey]);
      await writeAudit(c, ctx, 'permission.revoke', { user_id: i.userId, tenant_id: i.tenantId, permission_key: i.permissionKey });
      fireWebhook(ctx.actorUserId, 'permission.revoke:' + i.permissionKey, i.tenantId);
    });
  }
  return { grantRole, revokeRole, grantPermission, revokePermission };
}
export type GrantService = ReturnType<typeof createGrantService>;