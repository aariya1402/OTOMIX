import type { Pool } from 'pg';

export interface AdminAuditInput {
  actorId: string;
  tenantId: string;
  action: string;
  detail: unknown;
}

export async function writeAdminAudit(pg: Pool, input: AdminAuditInput): Promise<void> {
  const { actorId, tenantId, action, detail } = input;
  if (!actorId || !tenantId || !action) {
    throw new Error('writeAdminAudit: actorId, tenantId, action are required');
  }
  await pg.query(
    'INSERT INTO admin_audit (audit_id, tenant_id, actor_id, action, detail, at_utc) VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, now())',
    [tenantId, actorId, action, JSON.stringify(detail)]
  );
}