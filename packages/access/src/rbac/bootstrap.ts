import type { Pool } from 'pg';
import { sendEscalationWebhook, EscalationWebhookConfig } from '../escalation-webhook';

export interface BootstrapInput {
  userId: string;
  tenantId: 'otomix' | 'otodj';
  webhookConfig?: EscalationWebhookConfig;
}
export interface BootstrapResult {
  assignedRole: 'super_admin' | 'regular_user';
  isFirstUser: boolean;
}

const SYSTEM_BOOTSTRAP_USER_ID = {
  otomix: '00000000-0000-0000-0000-000000000001',
  otodj: '00000000-0000-0000-0000-000000000002',
} as const;

export async function bootstrapTenant(pg: Pool, tenantId: 'otomix' | 'otodj'): Promise<void> {
  const r = await pg.query('SELECT 1 FROM roles WHERE role_name=$1 AND tenant_id=$2', ['super_admin', tenantId]);
  if (r.rows.length === 0) throw new Error('super_admin role missing for tenant ' + tenantId);
}

export async function ensureBootstrap(pg: Pool, input: BootstrapInput): Promise<BootstrapResult> {
  const client = await pg.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [input.tenantId]);

    const saR = await client.query('SELECT role_id FROM roles WHERE role_name=$1 AND tenant_id=$2', ['super_admin', input.tenantId]);
    const ruR = await client.query('SELECT role_id FROM roles WHERE role_name=$1 AND tenant_id=$2', ['regular_user', input.tenantId]);
    if (saR.rows.length === 0 || ruR.rows.length === 0) throw new Error('base roles missing');

    const saId = saR.rows[0].role_id;
    const ruId = ruR.rows[0].role_id;

    const existing = await client.query(
      'SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id=$1 AND ur.tenant_id=$2 AND ur.revoked_at IS NULL LIMIT 1',
      [input.userId, input.tenantId]
    );
    if (existing.rows.length > 0) {
      const name = String(existing.rows[0].role_name);
      const role: 'super_admin' | 'regular_user' = name === 'super_admin' ? 'super_admin' : 'regular_user';
      await client.query('COMMIT');
      return { assignedRole: role, isFirstUser: role === 'super_admin' };
    }

    const countR = await client.query("SELECT COUNT(DISTINCT ur.user_id)::int AS c FROM user_roles ur WHERE ur.tenant_id=$1 AND ur.revoked_at IS NULL AND ur.user_id != $2", [input.tenantId, input.userId]);
    const count = Number(countR.rows[0].c);
    const isFirstUser = count === 0;
    const assignedRole: 'super_admin' | 'regular_user' = isFirstUser ? 'super_admin' : 'regular_user';
    const roleId = isFirstUser ? saId : ruId;
    const systemUserId = SYSTEM_BOOTSTRAP_USER_ID[input.tenantId];

    await client.query(
      'INSERT INTO user_roles (user_id, tenant_id, role_id, granted_at, granted_by) VALUES ($1,$2,$3,now(),$4) ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING',
      [input.userId, input.tenantId, roleId, systemUserId]
    );
    await client.query(
      "INSERT INTO admin_audit (audit_id, tenant_id, actor_id, action, detail, at_utc) VALUES (gen_random_uuid(), $1, $2, 'user.bootstrap', $3::jsonb, now())",
      [input.tenantId, systemUserId, JSON.stringify({ user_id: input.userId, tenant_id: input.tenantId, assigned_role: assignedRole, is_first_user: isFirstUser })]
    );
    await client.query('COMMIT');

    if (isFirstUser && input.webhookConfig) {
      sendEscalationWebhook({ actor: systemUserId, scope: 'role.grant:super_admin', tenant: input.tenantId, timestamp: new Date().toISOString() }, input.webhookConfig).catch(() => {});
    }
    return { assignedRole, isFirstUser };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}