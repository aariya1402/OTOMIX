import { Pool, PoolClient } from 'pg';
export type TenantId = 'otomix' | 'otodj';
/**
 * Executes a callback within a transaction where `app.tenant_id` is set
 * to the provided tenantId. The setting is transaction-local (is_local=true),
 * so it automatically resets on COMMIT or ROLLBACK.
 */
export declare function withTenant<T>(
  pool: Pool,
  tenantId: TenantId,
  fn: (client: PoolClient) => Promise<T>
): Promise<T>;
//# sourceMappingURL=with-tenant.d.ts.map
